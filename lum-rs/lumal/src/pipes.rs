//! Module for managing Pipes

use crate::*;
use crate::{ComputePipe, RasterPipe};
use ash::vk::{self, CompareOp, StencilOp};
use descriptors::*;

impl Renderer {
    /// Destroys ComputePipe
    pub fn destroy_compute_pipe(&mut self, pipe: ComputePipe) {
        assert!(pipe.line != vk::Pipeline::null());
        assert!(pipe.line_layout != vk::PipelineLayout::null());
        assert!(pipe.set_layout != vk::DescriptorSetLayout::null());
        unsafe {
            self.device.destroy_pipeline(pipe.line, None);
            self.device.destroy_pipeline_layout(pipe.line_layout, None);
            self.device.destroy_descriptor_set_layout(pipe.set_layout, None);
            self.device
                .free_descriptor_sets(self.descriptor_pool, pipe.sets.as_slice())
                .unwrap();
        }
    }

    /// Destroys RasterPipe
    pub fn destroy_raster_pipe(&mut self, pipe: RasterPipe) {
        assert!(pipe.line != vk::Pipeline::null());
        assert!(pipe.layout != vk::PipelineLayout::null());
        assert!(pipe.set_layout != vk::DescriptorSetLayout::null());
        unsafe {
            self.device.destroy_pipeline(pipe.line, None);
            self.device.destroy_pipeline_layout(pipe.layout, None);
            self.device.destroy_descriptor_set_layout(pipe.set_layout, None);
            self.device
                .free_descriptor_sets(self.descriptor_pool, pipe.sets.as_slice())
                .unwrap();
        }
    }

    /// Creates ComputePipe
    /// dynamic descriptors are going to set 1, static are going to set 0
    pub fn create_compute_pipe(
        &self,
        pipe: &mut ComputePipe,
        extra_dynamic_layout: Option<vk::DescriptorSetLayout>,
        spirv_code: &[u8],
        push_size: u32,
        create_flags: vk::PipelineCreateFlags,
        #[cfg(feature = "debug_validation_names")] debug_name: Option<&str>,
    ) {
        assert!(!spirv_code.is_empty());

        let (module, comp_shader_stage_info) = {
            let module = Self::load_shader_module(&self.device, spirv_code);

            set_debug_names!(self, debug_name, (&module, "Shader Module"));

            assert!(module != vk::ShaderModule::null());

            (
                module,
                vk::PipelineShaderStageCreateInfo {
                    stage: vk::ShaderStageFlags::COMPUTE,
                    module,
                    p_name: c"main".as_ptr(),
                    ..Default::default()
                },
            )
        };

        // Descriptor set layouts
        let mut used_dset_layouts = vec![pipe.set_layout];
        if let Some(dynamic_layout) = extra_dynamic_layout {
            used_dset_layouts.push(dynamic_layout);
        }

        // Pipeline layout
        let pipeline_layout_info = vk::PipelineLayoutCreateInfo {
            set_layout_count: used_dset_layouts.len() as u32,
            p_set_layouts: used_dset_layouts.as_ptr(),
            push_constant_range_count: (push_size > 0) as u32,
            p_push_constant_ranges: if (push_size > 0) {
                &vk::PushConstantRange {
                    stage_flags: vk::ShaderStageFlags::COMPUTE,
                    offset: 0,
                    size: push_size,
                }
            } else {
                std::ptr::null()
            },
            ..Default::default()
        };

        let line_layout = unsafe {
            self.device
                .create_pipeline_layout(&pipeline_layout_info, None)
                .expect("Failed to create pipeline layout")
        };

        // Compute pipeline
        let pipeline_info = vk::ComputePipelineCreateInfo {
            stage: comp_shader_stage_info,
            layout: line_layout,
            flags: create_flags,
            ..Default::default()
        };

        let line = unsafe {
            self.device
                .create_compute_pipelines(vk::PipelineCache::null(), &[pipeline_info], None)
                .expect("Failed to create compute pipeline")[0]
        };

        // Clean up shader module
        unsafe {
            self.device.destroy_shader_module(module, None);
        }

        assert!(line != vk::Pipeline::null());
        assert!(line_layout != vk::PipelineLayout::null());

        // Update the pipeline
        pipe.line = line;
        pipe.line_layout = line_layout;

        set_debug_names!(
            self,
            debug_name,
            (&pipe.line, "Pipeline"),
            (&pipe.line_layout, "Pipeline Layout")
        );
    }

    // descriptors in extra_dynamic_layout are going to set 1, all others are going to set 0
    /// Simple constructor for RasterPipe
    pub fn create_raster_pipe(
        &self,
        pipe: &mut RasterPipe,
        extra_dynamic_layout: Option<vk::DescriptorSetLayout>,
        vertex_code: &[u8],
        fragment_code: Option<&[u8]>,
        attr_desc: &[AttrFormOffs],
        stride: u32,
        input_rate: vk::VertexInputRate,
        topology: vk::PrimitiveTopology,
        extent: vk::Extent2D,
        blends: &[BlendAttachment],
        push_size: u32,
        depth_test: DepthTesting,
        depth_compare_op: vk::CompareOp,
        culling: vk::CullModeFlags,
        stencil: vk::StencilOpState,
        #[cfg(feature = "debug_validation_names")] debug_name: Option<&str>,
    ) {
        let vertex_module = Self::load_shader_module(&self.device, vertex_code);
        let vertex_stage = vk::PipelineShaderStageCreateInfo {
            stage: vk::ShaderStageFlags::VERTEX,
            module: vertex_module,
            p_name: c"main".as_ptr(),
            ..Default::default()
        };
        let fragment_module =
            fragment_code.map(|code| Self::load_shader_module(&self.device, code));
        let fragment_stage = fragment_module.map(|module| vk::PipelineShaderStageCreateInfo {
            stage: vk::ShaderStageFlags::FRAGMENT,
            module,
            p_name: c"main".as_ptr(),
            ..Default::default()
        });
        let pipeline_stages: Vec<vk::PipelineShaderStageCreateInfo> =
            std::iter::once(vertex_stage).chain(fragment_stage).collect(); // TODO: check asm of this functional style

        // Create color blend state
        let color_blend_attachments: Vec<vk::PipelineColorBlendAttachmentState> = blends
            .iter()
            .map(|blend_attach| {
                let mut vk_blend = vk::PipelineColorBlendAttachmentState {
                    blend_enable: vk::FALSE,
                    color_write_mask: vk::ColorComponentFlags::RGBA,
                    src_color_blend_factor: vk::BlendFactor::SRC_ALPHA,
                    dst_color_blend_factor: vk::BlendFactor::ONE_MINUS_SRC_ALPHA,
                    src_alpha_blend_factor: vk::BlendFactor::SRC_ALPHA,
                    dst_alpha_blend_factor: vk::BlendFactor::ONE_MINUS_SRC_ALPHA,
                    ..Default::default()
                };

                if *blend_attach == BlendAttachment::NoBlend {
                    vk_blend.blend_enable = vk::FALSE;
                } else {
                    vk_blend.blend_enable = vk::TRUE;
                }

                match blend_attach {
                    BlendAttachment::BlendMix => {
                        vk_blend.alpha_blend_op = vk::BlendOp::ADD;
                        vk_blend.color_blend_op = vk::BlendOp::ADD;
                    }
                    BlendAttachment::BlendSub => {
                        vk_blend.src_color_blend_factor = vk::BlendFactor::ONE;
                        vk_blend.dst_color_blend_factor = vk::BlendFactor::ONE;
                        vk_blend.src_alpha_blend_factor = vk::BlendFactor::SRC_ALPHA;
                        vk_blend.dst_alpha_blend_factor = vk::BlendFactor::ONE_MINUS_SRC_ALPHA;
                        vk_blend.color_blend_op = vk::BlendOp::SUBTRACT;
                        vk_blend.alpha_blend_op = vk::BlendOp::ADD;
                    }
                    BlendAttachment::BlendReplaceIfGreater => {
                        vk_blend.src_color_blend_factor = vk::BlendFactor::ONE;
                        vk_blend.dst_color_blend_factor = vk::BlendFactor::ONE;
                        vk_blend.color_blend_op = vk::BlendOp::MAX;
                        vk_blend.src_alpha_blend_factor = vk::BlendFactor::ONE;
                        vk_blend.dst_alpha_blend_factor = vk::BlendFactor::ZERO;
                        vk_blend.alpha_blend_op = vk::BlendOp::ADD;
                    }
                    BlendAttachment::BlendReplaceIfLess => {
                        vk_blend.src_color_blend_factor = vk::BlendFactor::ONE;
                        vk_blend.dst_color_blend_factor = vk::BlendFactor::ONE;
                        vk_blend.color_blend_op = vk::BlendOp::MIN;
                        vk_blend.src_alpha_blend_factor = vk::BlendFactor::ONE;
                        vk_blend.dst_alpha_blend_factor = vk::BlendFactor::ZERO;
                        vk_blend.alpha_blend_op = vk::BlendOp::ADD;
                    }
                    BlendAttachment::NoBlend => {}
                };

                vk_blend
            })
            .collect();

        // Just vec of enabled dynamic states
        let dynamic_states: Vec<vk::DynamicState> =
            vec![vk::DynamicState::VIEWPORT, vk::DynamicState::SCISSOR];

        // Setup dynamic states
        let dynamic_state = vk::PipelineDynamicStateCreateInfo {
            dynamic_state_count: dynamic_states.len() as u32,
            p_dynamic_states: dynamic_states.as_ptr(),
            ..Default::default()
        };

        let used_dset_layouts: &[vk::DescriptorSetLayout] = match extra_dynamic_layout {
            Some(layout) => &[pipe.set_layout, layout],
            None => &[pipe.set_layout],
        };

        let mut push_range = vk::PushConstantRange {
            stage_flags: vk::ShaderStageFlags::empty(),
            offset: 0,
            size: push_size,
        };
        // for shader_stage in shader_stages {
        //     push_range.stage_flags |= shader_stage.stage;
        // }
        push_range.stage_flags |= vk::ShaderStageFlags::VERTEX;
        if fragment_code.is_some() {
            push_range.stage_flags |= vk::ShaderStageFlags::VERTEX;
        }

        // Setup pipeline layout
        let pipeline_layout_create_info = vk::PipelineLayoutCreateInfo {
            set_layout_count: used_dset_layouts.len() as u32,
            p_set_layouts: used_dset_layouts.as_ptr(),
            push_constant_range_count: (push_size > 0) as u32,
            p_push_constant_ranges: if push_size > 0 {
                &push_range
            } else {
                std::ptr::null()
            },
            ..Default::default()
        };

        let pipeline_layout = unsafe {
            self.device.create_pipeline_layout(&pipeline_layout_create_info, None).unwrap()
        };

        let binding_description = vk::VertexInputBindingDescription {
            binding: 0,
            stride,
            input_rate,
        };

        let actual_attr_desc: Vec<vk::VertexInputAttributeDescription> = attr_desc
            .iter()
            .enumerate()
            .map(|(i, desc)| vk::VertexInputAttributeDescription {
                location: i as u32,
                binding: desc.binding,
                format: desc.format,
                offset: desc.offset as u32,
            })
            .collect();

        let vertex_input_info = match attr_desc.len() {
            0 => vk::PipelineVertexInputStateCreateInfo::default(),
            _ => vk::PipelineVertexInputStateCreateInfo {
                vertex_binding_description_count: 1,
                p_vertex_binding_descriptions: &binding_description,

                vertex_attribute_description_count: attr_desc.len() as u32,
                p_vertex_attribute_descriptions: actual_attr_desc.as_ptr(),
                ..Default::default()
            },
        };

        let input_assembly_state = vk::PipelineInputAssemblyStateCreateInfo {
            topology,
            primitive_restart_enable: vk::FALSE,
            ..Default::default()
        };

        let viewport_state = vk::PipelineViewportStateCreateInfo {
            viewport_count: 1,
            scissor_count: 1,
            ..Default::default()
        };

        let rasterizer = vk::PipelineRasterizationStateCreateInfo {
            depth_clamp_enable: vk::FALSE,
            rasterizer_discard_enable: vk::FALSE,
            polygon_mode: vk::PolygonMode::FILL,
            cull_mode: culling,
            front_face: vk::FrontFace::COUNTER_CLOCKWISE,
            depth_bias_enable: vk::FALSE,
            depth_bias_constant_factor: 0.0,
            depth_bias_clamp: 0.0,
            depth_bias_slope_factor: 0.0,
            line_width: 1.0,
            ..Default::default()
        };

        let multisample_state = vk::PipelineMultisampleStateCreateInfo {
            rasterization_samples: vk::SampleCountFlags::TYPE_1,
            sample_shading_enable: vk::FALSE,
            min_sample_shading: 0.0,
            ..Default::default()
        };

        let depth_stencil = vk::PipelineDepthStencilStateCreateInfo {
            depth_test_enable: (depth_test == DepthTesting::Read
                || depth_test == DepthTesting::ReadWrite) as u32,
            depth_write_enable: (depth_test == DepthTesting::Write
                || depth_test == DepthTesting::ReadWrite) as u32,
            depth_compare_op,
            depth_bounds_test_enable: vk::FALSE,
            stencil_test_enable: !Self::stencil_is_empty(stencil) as u32,
            front: stencil,
            back: stencil,
            max_depth_bounds: 1.0,
            min_depth_bounds: 0.0,
            ..Default::default()
        };

        let color_blend_state = vk::PipelineColorBlendStateCreateInfo {
            logic_op_enable: vk::FALSE,
            logic_op: vk::LogicOp::COPY,
            attachment_count: color_blend_attachments.len() as u32,
            p_attachments: color_blend_attachments.as_ptr(),
            blend_constants: [0.0; 4],
            ..Default::default()
        };

        // Finalize pipeline creation
        let pipeline_create_info = vk::GraphicsPipelineCreateInfo {
            stage_count: pipeline_stages.len() as u32,
            p_stages: pipeline_stages.as_ptr(),
            p_vertex_input_state: &vertex_input_info,
            p_input_assembly_state: &input_assembly_state,
            p_tessellation_state: std::ptr::null(),
            p_viewport_state: &viewport_state,
            p_rasterization_state: &rasterizer,
            p_multisample_state: &multisample_state,
            p_depth_stencil_state: {
                if depth_test == DepthTesting::None && Self::stencil_is_empty(stencil) {
                    std::ptr::null()
                } else {
                    &depth_stencil
                }
            },
            p_color_blend_state: &color_blend_state,
            p_dynamic_state: &dynamic_state,
            layout: pipeline_layout,
            render_pass: pipe.renderpass, // you HAVE TO set id in advance
            subpass: pipe.subpass_id as u32, // you HAVE TO set it in advance
            base_pipeline_index: -1,
            ..Default::default()
        };

        let pipeline = unsafe {
            self.device
                .create_graphics_pipelines(vk::PipelineCache::null(), &[pipeline_create_info], None)
                .unwrap()
        }[0];

        unsafe {
            self.device.destroy_shader_module(vertex_module, None);
            if let Some(module) = fragment_module {
                self.device.destroy_shader_module(module, None)
            }
        };

        // dots never meant anything]
        pipe.line = pipeline;
        pipe.layout = pipeline_layout;

        // give debug names to vulkan objects
        #[cfg(feature = "debug_validation_names")]
        set_debug_names!(
            self,
            debug_name,
            (&pipe.line, "Pipeline"),
            (&pipe.line_layout, "Pipeline Layout")
        );
    }

    /// Helper function for determining if stencel test is doing anything
    fn stencil_is_empty(stencil: vk::StencilOpState) -> bool {
        (stencil.fail_op == StencilOp::KEEP)
            && (stencil.pass_op == StencilOp::KEEP)
            && (stencil.depth_fail_op == StencilOp::KEEP)
            && (stencil.compare_op == CompareOp::NEVER)
            && (stencil.compare_mask == 0)
            && (stencil.write_mask == 0)
            && (stencil.reference == 0)
    }

    /// Helper function for loading SPIR-V shader modules
    fn load_shader_module(device: &Device, spirv_code: &[u8]) -> vk::ShaderModule {
        let create_info = vk::ShaderModuleCreateInfo {
            code_size: spirv_code.len(),
            p_code: spirv_code.as_ptr() as *const u32,
            ..Default::default()
        };
        unsafe { device.create_shader_module(&create_info, None).unwrap() }
    }
}
