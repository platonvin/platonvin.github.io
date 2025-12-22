One Graphics API

tl;dr:
1 arch to make it even simpler. Plays nicely with pointers.

This is textual representation of what sparked in my brain after i read [Sebastian Aaltonen article](https://www.sebastianaaltonen.com/blog/no-graphics-api)
If you think i am wrong - please, correct me (gotta learn somehow). I likely fucked something up.

lets just lock ISA (and some other details). GPUs are still "evolving", but their architecture has not fundamentally changed and is somewhat similar across vendors.

Following is reflections on "what if..."

Drivers currently act like JIT compilers. If we had same instruction set everyone agrees on, this problem would vanish*. You would be able to **actually** compile and optimize your shaders. No pipeline caches.
drawback: we will get microcode-like thing then. Currently, drivers compile shaders into actual instructions, and they get directly executed. However, one could argue microcode can actually be an optimization for more compact instructions and simpler internals.
In any way, microcode does not run expensive optimization passes or run CPU code in runtime :)
*: we would stop shipping 'Intermediate Representations' and start shipping binaries, just like C.

Locked ISA solves big nightmare in graphics: vendor-specific tooling. Currently, to profile shaders, you need Nvidia Nsight for Nvidia because the ISAs are secret (i dont have AMD gpu and Intel profiler seems not very useful compared to Nsight).
We would have actual opensource debuggers, profilers


If the hardware gets standardized, there is less variable features to worry about. Over time we would get more and more extensions, like with x86, but imo thats a lot better than multiple truly different architectures.

I very much liked the idea of making things pointers. I do not believe automatic "is memory visible to CPU" management and "GPU memory magically behaves like CPU memory" is right choice tho - even with ReBAR (which is just Resizeable BAR) PCIe latency & bandwidth are still a problem. I would like to mange what goes to "fast, internal GPU memory" and what stays in "small, visible to CPU area" myself, otherwise there must be something managing it for me __in runtime__, or extra transistors wiring all memory to PCIe
If we could somehow get SoC architecture that everyone agrees on that would be even better. Basically standartize integrated GPUs? That would smooth out **so many** skill issues - just look at Apple

Lets expand on pointers a little. Since we are locking everything and trying to make things simpler, we can just say that "descriptors are just pointers", buffers & textures are same - just memory, and differ in how you access them. You would have instructions for just memory loads, computed manually for "linear layout" textures, but also some (agreed on and standardized) "morton indexing-like", as well as compression. These could be arguments to an instruction:
load_image: x,y,z, LYAOUT_MORTON_BIT | COMPRESSION_BC7_BIT
Since everyone would know layout, loading images would be a lot simpler (no extra copy with custom pixels reordering)

problem: afaik Nvidia / AMD memory controllers are designed for very different layouts. However, running at 80% efficency is still fine for sake of stability, faster asset streaming and developer sanity.

So, buffer is just memory you allocate and manage (free, divide in sub-buffers with your custom allocator) yourself. But what is a descriptor?
Descriptor is just pointer! What matters is how you access memory.
To deliver them to shader, lets say all descriptors are bound as single buffer, but it is not locked to just descriptors. Effectively you'll have a way to bind some memory to shader "directly", and treat it as you like. 

Example:
```h
struct MyPushConstantsBuffer {
    model_transform: mat4
    model_size: vec4
}
struct MyUBO {
    camera_position: vec4,
    camera_direction: vec4,
}
struct MyBufferElem {
    val: float
}
// data, embedded directly into shader descriptor 
BIND: pco: MyPushConstantsBuffer;
// pointer to your MyUBO. Could be "embedded" into descriptor but instead is referred by pointer. 
// Maybe its big and you want to share it across multiple shaders 
BIND: ubo: *MyUBO;
// could be void and just casted to val*
BIND: my_buffer: *val; 
// typed in your shader language, and only thing type does is results to proper bits for setting asm instruction from loading from memory.
// this is how you would do what is currently "bindless"
BIND: my_texture_arr: **Texture<rgba16float>; 
```

and in API you would be able to bind memory (by GPU pointer) to the shader. 
Exactly `sizeof(mat4) + sizeof(vec4) + 3*sizeof(pointer)` bytes would be bound.
```
ApiCmdBindDescriptorBuffer(void* gpu_ptr_to_buffer)
```
want to have 2 buffers? Allocate memory for 2 and pass with offset

*this is effectively single descriptor set, but so far i am not convinced having multiple descriptor sets is a good idea (they let you manage parts of what is bound to shader separately, but you can as well just have different buffers or update part of single buffer from GPU)

Vulkan has concept of push constant. Vulkan also has vkCmdUpdateBuffer. I ditch them as you can see above, and they are just memory in what is bound to shader. Key part of push constants is very easy update from CPU by embedding their data directly in command buffer.

Lets keep that (for faster prototyping, and as fast way to deliver small blobs of data), and expand to any memory:
ApiCmdUpdateMemory(void* src_cpu_ptr, void* dst_gpu_ptr, size_t size)
This is both push constants and descriptor writes.
Unlike both, you would be able to e.g. write "descriptor buffer" for one shader in from shader. Or copy from another buffer (just memory!). Or update part of it from CPU.
"bound descriptor buffer" would likely have some restriction (e.g. up to 1kb)

<small>**i already love this, thank you Sebastian**</small>

We could also remove "vertex" buffers. Programmable Vertex Pulling is a thing, and vendors could silently convert it back to hw feature.
We can have "hints" in shader code - e.g. that "this memory is read sequentially for each vertex so use vertex fetching" or "early depth testing is allowed here"
Completely removing "vertex" stage and having you program mesh shaders is also an option.

Syncronisation:
In my tests, "full memory read / write" barriers were not any different in perfomance from precise ones. We could go further: "offensive" synchronization, where barriers are "full read/write" unless specified (again, faster prototyping, later refining, which is what you usually do in Vulkan anyways)

Similarly, image layouts are somewhat outdated for desktop GPUs. Using VK_IMAGE_LAYOUT_GENERAL for everything works. You **will** use it for complicated workloads anyways (since other layouts are not compatible with wide range of operations a lot of optimized rendering requires).
In **fact**, [Nvidia states](https://developer.nvidia.com/sites/default/files/akamai/gameworks/VulkanDevDaypdaniel.pdf) (<quote>`On NVIDIA GPUs image layouts are irrelevant
Just leave images in the VK_IMAGE_LAYOUT_GENERAL layout`</quote>) that they completely ignore specified layout and manage it automatically.
Image tiling is not controlled by you. Since we agree on compression/pixels layout and hw, we dont need "image layout" to reflect that it might be something incompatible with some operations.

I have nothing to say on fences & semaphores.
Queues are cool but afaik they are only used for async compute in a way that could be expressed as just better barriers* (no need of API concept for that)
* this currently does **not** work this way, but i believe it is possible to express through syncronisation. Alternatively, we could represent current hw - have 3 distinct queues - compute, transfer and raster.

Subgroup operations would become more common if everyone agrees on subgroup sizes. Currently its a pain to write cross-platformly.

Defense of subpasses:
I might be dumb here, but subpasses give way more useful context for drivers compared to "fbo fetches" instructions. And they are not desktop specific - Nvidia is also doing some [magic](https://www.youtube.com/watch?v=Nc6R1hwXhL8) with subpasses
SoC would probably do subpasses.

All this does not go against having normal Vulkan/DX12 drivers. If anything, such hardware would support a lot of extensions.

So, how would this impact our world? Old games would still work because Vulkan/DX12 drivers do not go away. Hardware does not change fundamentally - it already has most of features. Perfomance maybe slightly decreases (we are not removing any specialized hardware, but we are adding more stuff so less transistors for the rest)
