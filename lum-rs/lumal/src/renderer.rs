use crate::*;
use ash::prelude::VkResult;
use std::result::Result::Ok;

impl Renderer {
    /// Moves renderer into mode where executing/recording commands is valid
    pub fn start_frame(&mut self, command_buffers: &[vk::CommandBuffer]) {
        unsafe {
            self.device
                .wait_for_fences(&[*self.in_flight_fences.current()], true, u64::MAX)
                .unwrap();
            self.device.reset_fences(&[*self.in_flight_fences.current()]).unwrap();
        };

        let begin_info = vk::CommandBufferBeginInfo::default();

        for command_buffer in command_buffers {
            unsafe {
                self.device
                    .reset_command_buffer(*command_buffer, vk::CommandBufferResetFlags::empty())
                    .unwrap();
            }

            unsafe {
                self.device.begin_command_buffer(*command_buffer, &begin_info).unwrap();
            }
        }

        let index_code = unsafe {
            // this is index of swapchain image that we should render to
            // it is not just incremented-wrapped because driver might (and will) juggle them around for perfomance reasons
            self.swapchain_loader.acquire_next_image(
                self.swapchain,
                u64::MAX,
                *self.image_available_semaphores.current(),
                vk::Fence::null(), // no fence
            )
        };

        self.process_error_code(index_code);
    }

    /// Presents frame on screen. Called in end_frame
    pub fn present_frame(&mut self) {
        let wait_semaphores = [*self.render_finished_semaphores.current()];
        let swapchains = [self.swapchain];
        let image_indices = [self.image_index];
        let present_info = vk::PresentInfoKHR {
            wait_semaphore_count: wait_semaphores.len() as u32,
            p_wait_semaphores: wait_semaphores.as_ptr(),
            swapchain_count: swapchains.len() as u32,
            p_swapchains: swapchains.as_ptr(),
            p_image_indices: image_indices.as_ptr(),
            ..Default::default()
        };

        let error_code =
            unsafe { self.swapchain_loader.queue_present(self.graphics_queue, &present_info) };

        self.process_success_code(error_code);
    }

    /// Finishes stage of recording commands and submits work to GPU
    pub fn end_frame(&mut self, command_buffers: &[vk::CommandBuffer]) {
        for command_buffer in command_buffers {
            unsafe {
                self.device.end_command_buffer(*command_buffer).unwrap();
            }
        }
        let signal_semaphores = [*self.render_finished_semaphores.current()];
        let wait_semaphores = [*self.image_available_semaphores.current()];
        let wait_stages = [vk::PipelineStageFlags::COLOR_ATTACHMENT_OUTPUT];
        let submit_info = vk::SubmitInfo {
            wait_semaphore_count: wait_semaphores.len() as u32,
            p_wait_semaphores: wait_semaphores.as_ptr(),
            p_wait_dst_stage_mask: wait_stages.as_ptr(),
            command_buffer_count: command_buffers.len() as u32,
            p_command_buffers: command_buffers.as_ptr(),
            signal_semaphore_count: signal_semaphores.len() as u32,
            p_signal_semaphores: signal_semaphores.as_ptr(),
            ..Default::default()
        };

        unsafe {
            // ask a queue to execute the commands in command buffer
            self.device
                .queue_submit(
                    self.graphics_queue,
                    &[submit_info],
                    *self.in_flight_fences.current(),
                )
                .unwrap();
        }

        self.present_frame();

        self.image_available_semaphores.move_next();
        self.render_finished_semaphores.move_next();
        self.in_flight_fences.move_next();
        // counter for internal purposes
        self.frame += 1;
    }

    fn process_error_code(&mut self, index_code: VkResult<(u32, bool)>) {
        // man why did you corrode vulkan. Should i make my own fn wrapper?
        match index_code {
            Ok((index, suboptimal)) => {
                self.image_index = index;
                if suboptimal {
                    self.should_recreate = true;
                }
            }
            Err(vk_res) => {
                match vk_res {
                    vk::Result::ERROR_OUT_OF_DATE_KHR => {
                        // out of date => clearly recreate
                        self.should_recreate = true;
                    }
                    _ => {
                        panic!("unknown error code on aquire_next_image_khr: {vk_res:?}");
                    }
                }
            }
        }
    }

    // does someone know how to make this cleaner?
    fn process_success_code(&mut self, index_code: VkResult<bool>) {
        match index_code {
            Ok(suboptimal) => {
                if suboptimal {
                    // i still do not really know if suboptimal should be recreated. Works on my machine ©
                    self.should_recreate = true;
                    // we DO NOT recreate swaphcain here
                    // DO NOT even FUCKING EVER THINK ABOUT IT
                    // self.recreate_swapchain(window);
                }
            }
            Err(vk_res) => match vk_res {
                vk::Result::ERROR_OUT_OF_DATE_KHR => {
                    self.should_recreate = true;
                    // we DO NOT recreate swaphcain here
                    // DO NOT even FUCKING EVER THINK ABOUT IT
                    // self.recreate_swapchain(window);
                }
                _ => {
                    panic!("unknown error code on queue_present_khr: {vk_res:?}");
                }
            },
        }
    }
}
