---
title: "platonvin: Voxels"
backlink: "../index.html"
headline: "how Lum works"
comments: true
---

## Why is this an article?
Really, just in hopes it makes GPUs "click" for someone. You are free to ask (literally any amount of any) questions (anywhere)

## What?
Lum is a voxel renderer i develop to power some of my future games. It is not an extendable general purpose engine, rather fast and simple library.

I am not an artist, and Lum embraces that - you are expected to reuse assets (in a form of blocks), program animations and draw some things with shaders.

## key structures
`Material`
: Represent type of voxel by its properties, such as color, roughness, emittance, etc.

`Material palette`
: Array of materials. Currently, limited by 255 (256, but first one is never accessed and represent "air")

`Voxel`
: An index into a material palette (so, data of voxel is its material). Represented by single `u8`. `0` means "air" - empty voxels

`Model`
: A free-form, self-aligned (so not world-aligned) voxel mesh of any size (up to 255x255x255 to fit in `u8`).
  Each model's voxels live in its own 3D image.

`Block`
: A grid-aligned voxel mesh, exactly 16x16x16 in size. Blocks voxel data lives in block palette

`Block palette`
: a large 3D image storing many 16^3 sub-blocks
  (we use an image cause hw sampling & tiling, but anything would do the job).
  * Blocks in block palette come in two flavors:
    * Static - immutable assets, e.g. loaded from files
    * Dynamic - ones that are [created and modified] every frame to represent some dynamic changes. When a model needs to be placed in the world, we want to represent its voxels in our data structure, but we cant modify the blocks it occupies - their data is origin for multiple instances. Instead, a new "dynamic" blocks are allocated in the palette, the original static blocks data is copied into it, and the world grid's "pointer" is updated to this new (mutable) copy. This is effectively a `Cow` - Copy-on-write
  * Note: code that reads a block "pointer" doesn't care whether it's static or dynamic - all processing is identical.

`World`
: A 3D grid of block "pointers" (indices into that block palette).

`Radiance field`
: A 3D grid of lighting probes, one per block, representing corresponding (per-block) ligting



## Rendering pipeline
Before renderer even starts, "render requests" are collected from user code. Render request is a "command" to renderer that looks like `{draw this block id at this position}` or `{draw this model with this rotation and this translation}`. Then, the pipeline looks something like this:

* CPU preparation: Some regular GAPI-related CPU work. We also sort requests by depth (for Vulkan) / state (for WGPU), update per-frame GPU data and figure out which radiance probes need to be updated this frame (any block with a non-empty neighbor. btw this is current bottleneck) and upload their positions to the GPU
* Lightmaps: Sun lightmaps for blocks and models, nothing special
* GBuffer Pass: Lum is a "deferred" renderer, this stage determines voxel material and normal for each pixel
* Compute: Updates all lighting state (radiance fields) and builds voxel representations of models in out world.
* Shading: Actually draws stuff on screen (*mostly* from GBuffer) - diffuse & glossy, ambient occlusion, reflections, volumetrics, tonemapping and outputting into swapchain image



## Lightmaps
*(believe me, this boring part is necessary for an interesting one after)*<br />
We start by generating lightmaps for blocks and models. Lightmaps are a classic approach, and for this, we don't need voxel materials (until I implement transparency one day). We just need the geometry "contour" - vertices that define its silhouette.

To render this contour, we bind its vertex buffer and use push constants to pass in data for each draw call.

* for blocks, which are grid-aligned, this is just their position
* for models, it's rotation and translation

Since we only need model-space position for vertices, and models are not expected to be large, and vertices of a voxel are snapped to its corners, each vertex position can be a tiny `i8vec3` - just 3 bytes (in fact, model sizes are limit to 255 to fit into u8).

Also, for better culling, we don't actually store the contour as a single triangle mesh. We abuse the fact that voxel sides are grid-aligned and only have 6 possible normals. The mesh is divided into 6 sections, one for each normal, and we cull them separately against the camera direction (btw some big games also use it, but it works best for voxels).

*if you are wondering why rasterization and not raytracing - rasterization IS raytracing - it is optimization of specialized case of raytracing*

At this point, the lightmap command buffers are done (of course, we execute them before shading).



## GBuffer
Lum is a "deferred" renderer, and in this stage, we determine the voxel material and normal for each pixel.

This is where things get interesting. We actually don't need a second mesh - the `contour` we used for lightmapping is enough.

Since we render the 6 sides of the contour separately, they all have the same normal, which we just pass in push constants.

What about the material though? In the past, Lum encoded it into the vertex data (obvious thing to do). This required a lot of vertices (16x16 side of a block with random material voxels would generate a lot of vertices since they all have different material, unlike for contour, which can merge them) and Lum was (as you might have guessed from experience), vertex-bound.

The fix was to move this work into the pixel shader (individual voxel was 18 vertices, and resulted into few dozens of pixels - not a good ratio. right?). The vertex shader passes the interpolated model-space position of the vertex into the fragment shader. And as it turns out, that is enough to determine the material! We just fetch the voxel material at that position.

* For blocks, their voxel data is in the `block palette`, and the current (one that we are drawing) block's index in that palette is passed via push constants.
* For models, we store their voxel data each as a separate 3D image and bind them for every model draw call (or once for WGPU backend and batched drawcall).

At this point, we have rasterized all blocks and models into our GBuffer.

There are some small visual features that I just really wanted to implement, so here we are:

* Foliage: I thought that since the intention is to construct the world out of blocks, same can work for foliage - we don't need to store positions of individual foliage *objects*. So, foliage is generated entirely by shaders (mostly the vertex shader). We drawcall N instances of M vertices, where `n ⊂ (0...N)` corresponds to an index of a blade, and `m ⊂ (0..M)` corresponds to the index of a vertex in that blade.<br />
  Actually, 1 instance of `(M+1)*N` vertices is enough - we render blades as a triangle strip(s) (to do work only once per vertex), and we could insert `NaN` vertex between strips to prevent the GPU from rendering triangles connecting them, but we might as well use GPU built-in instances - just saves GPU few thrown away NaN triangles.
* Liquids: We could do a DFT/FFT for some big resolution, but it's too slow. Instead, we do a "fake/manual" FFT, where we compute a few separate small DFTs and combine them with different scales and amplitudes (I call them LOD levels). The height at a point `p` is `∑ᵢ Lodᵢ(p) * Scaleᵢ`.
  *If you are wondering where is actual liquid sim - im building renderer for games, not simulation. Faking visuals is enough*



## Compute
There is not much Lum does in compute workload - updating data structure to represent models, radiance field lighting and grass & water states.

At this point, all CPU parts of "Copy-on-write" happened - we "allocated" (which is just memorizing which indices are free and which are taken) temporary dynamic blocks on CPU. Now we actually copy data from static blocks to allocated dynamic ones (and for empty (air) blocks too, but for performance we "clear" (memset) corresponding subimages with 0). After that, for every requested model draw, we submit compute dispatch, that reads model-space voxel and writes it to corresponding world voxel - determines in which block it happens (reads world data), then indexes into block palette and determines actual voxel (previously we made sure all blocks that are occupied by models have been allocated, so we are guaranteed to not write static blocks).

Now, with updated data structure, it's time to update radiance field.

Radiance is per-block lighting probes, which describe luminance in every direction with some encoding (currently for performance tuning there is no direction, LOL). For shading a pixel, we interpolate between multiple adjacent probes to estimate light coming from all directions to this pixel (note, that we don't really care for it to be ReAlIsTiC, we only need it to look good).

So, we submit a compute shader, `NxMx1`, where N is number of radiance update requests, and M is number of rays per request. Currently, M is 64 (double warp size for swap, you know this). In each thread, we send a ray into random (uniform with some randomness) direction, raytrace it and downsample result to store in radiance probes (currently it has no direction, so just average across threads. When I'll make it 6-directional, there will be mixing to 6 different directions) and mix it with what is currently in radiance field (accumulating across time).

My raytracing is actually ray marching - making small steps and checking collisions. I tried "precise" raymarchers ("based" on famous paper from 1987), in multiple different variations (branches/masks/partially unrolled/), I tried distance fields, I tried bit arrays instead of voxel for "checking" if voxel is non-empty, but the fastest good looking solution turned out to be simple fixed-step raymarching with rollback on collision for precise hit processing (and with manual "jumps" over air (empty) blocks).

Details about actual material light processing don't really matter - it's just a visual thing, you can use whatever you want. I like primitive shading model with roughness, color and emmitance.

As optimization, for tracing probe rays, instead of doing it until hit / out-of-bounds, we do it for a fixed distance, and if not a hit, "inherit" light from end point - I call it light propagation (it is another way to accumulate over time/space). It also creates cool effect of visible light waves.



## Shading
Modern games think that rendering in full-res is slow, so they shade in low-res and then upscale. However, upscaling can be costly (and looks terrible, and then you need neural networks and even more temporal accumulation with complicated algorithms to fix it), while subpasses allow a lot of optimizations, so this tradeoff is almost never worth it. All of Lum's shading happens in a single render pass, and that is a key reason why it can run on laptops. The frame image we render to potentially never even leaves the GPU's on-chip memory.

The shading render pass order is:<br />
`"diffuse" light shading` → `ambient occlusion` → `glossy reflections` → `volumetrics` → `tonemapping to swapchain`.

* diffuse reads the GBuffer (also potentially loaded only once - its subpass input), samples radiance field + sun lightmaps and produces "diffuse" shading color of pixel

* ambient occlusion samples depth buffer of pixels nearby (so it's not purely subpass input sadly, since we need adjacent pixels. But it's filled in previous renderpass, so we can safely do it) and darkens pixel for "corners"

* glossy reflections shader uses same technique as radiance field updater, but with slightly different settings (and it is culled with cheap shader marking pixels for processing in stencil mask as an optimization. Because even if you immediately discard in expensive shader, it means that this thread will just idle while expensive computations happen - it is much better to not even start expensive shaders. Alternative is dynamically redistribute work with shared memory, but this is way too complicated)
  This is enhanced by a little bit of screen-space raymarching to preserve some of the non-grid-aligned details

* volumetrics sample 3D perlin noise as density and traversal thickness of volumetric in corresponding pixel to calculate total obfuscation, and then blend using it as alpha. No shiny raymarching towards light sources. They are culled in a similar to glossy way, but their stencil mask is setten by the same shader that determines thickness (just rasterizing volumetric shape into far&near depth images - this also means that it cant detect overlapping volumetrics and treats them as a single very thick one)

* tonemap does all per-pixel color processing - remapping color range, some filters, and outputs directly to swapchain image (we dont render to swapchain immediately because we need slightly higher color range)