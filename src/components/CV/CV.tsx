import React from 'react';
// import styles from './CV.module.css'; // Import the CSS Module

const CV: React.FC = () => {
  return (
    <div className="container">
      <header className="header">
        <h1>Platon Vinnichek</h1>
        <div className="CVcontact">
          <a href="mailto:platonvin@gmail.com">
            <span className="icon">&#9993;</span> platonvin@gmail.com
          </a>
          <a href="https://t.me/platonvin">
            <svg xmlns="http://www.w3.org/2000/svg" width="1.7em" height="1.7em" viewBox="0 0 256 256">
              <defs>
                <linearGradient id="logosTelegram0" x1="50%" x2="50%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#2aabee" />
                  <stop offset="100%" stopColor="#229ed9" />
                </linearGradient>
              </defs>
              <path
                fill="url(#logosTelegram0)"
                d="M128 0C94.06 0 61.48 13.494 37.5 37.49A128.04 128.04 0 0 0 0 128c0 33.934 13.5 66.514 37.5 90.51C61.48 242.506 94.06 256 128 256s66.52-13.494 90.5-37.49c24-23.996 37.5-56.576 37.5-90.51s-13.5-66.514-37.5-90.51C194.52 13.494 161.94 0 128 0"
              />
              <path
                fill="#fff"
                d="M57.94 126.648q55.98-24.384 74.64-32.152c35.56-14.786 42.94-17.354 47.76-17.441c1.06-.017 3.42.245 4.96 1.49c1.28 1.05 1.64 2.47 1.82 3.467c.16.996.38 3.266.2 5.038c-1.92 20.24-10.26 69.356-14.5 92.026c-1.78 9.592-5.32 12.808-8.74 13.122c-7.44.684-13.08-4.912-20.28-9.63c-11.26-7.386-17.62-11.982-28.56-19.188c-12.64-8.328-4.44-12.906 2.76-20.386c1.88-1.958 34.64-31.748 35.26-34.45c.08-.338.16-1.598-.6-2.262c-.74-.666-1.84-.438-2.64-.258c-1.14.256-19.12 12.152-54 35.686c-5.1 3.508-9.72 5.218-13.88 5.128c-4.56-.098-13.36-2.584-19.9-4.708c-8-2.606-14.38-3.984-13.82-8.41c.28-2.304 3.46-4.662 9.52-7.072"
              />
            </svg>
          </a>
          <a href="https://github.com/platonvin">
            <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24">
              <path
                fill="black"
                d="M16.24 22a1 1 0 0 1-1-1v-2.6a2.15 2.15 0 0 0-.54-1.66a1 1 0 0 1 .61-1.67C17.75 14.78 20 14 20 9.77a4 4 0 0 0-.67-2.22a2.75 2.75 0 0 1-.41-2.06a3.7 3.7 0 0 0 0-1.41a7.7 7.7 0 0 0-2.09 1.09a1 1 0 0 1-.84.15a10.15 10.15 0 0 0-5.52 0a1 1 0 0 1-.84-.15a7.4 7.4 0 0 0-2.11-1.09a3.5 3.5 0 0 0 0 1.41a2.84 2.84 0 0 1-.43 2.08a4.07 4.07 0 0 0-.67 2.23c0 3.89 1.88 4.93 4.7 5.29a1 1 0 0 1 .82.66a1 1 0 0 1-.21 1a2.06 2.06 0 0 0-.55 1.56V21a1 1 0 0 1-2 0v-.57a6 6 0 0 1-5.27-2.09a3.9 3.9 0 0 0-1.16-.88a1 1 0 1 1 .5-1.94a4.9 4.9 0 0 1 2 1.36c1 1 2 1.88 3.9 1.52a3.9 3.9 0 0 1 .23-1.58c-2.06-.52-5-2-5-7a6 6 0 0 1 1-3.33a.85.85 0 0 0 .13-.62a5.7 5.7 0 0 1 .33-3.21a1 1 0 0 1 .63-.57c.34-.1 1.56-.3 3.87 1.2a12.16 12.16 0 0 1 5.69 0c2.31-1.5 3.53-1.31 3.86-1.2a1 1 0 0 1 .63.57a5.7 5.7 0 0 1 .33 3.22a.75.75 0 0 0 .11.57a6 6 0 0 1 1 3.34c0 5.07-2.92 6.54-5 7a4.3 4.3 0 0 1 .22 1.67V21a1 1 0 0 1-.94 1"
              />
            </svg>
          </a>
        </div>
      </header>
      <strong>
        <h2>3D Graphics Programmer</h2>
      </strong>
      <h3>Experience</h3>
      <ul>
        <li>
          <strong>Lum Engine</strong> — <a className="alink" href="https://github.com/platonvin/lum">Repository</a> (C++17)
          <ul>
            <li>Developed a high-performance voxel renderer using Vulkan, delivering fully ray-traced real-time dynamic global illumination (GI)</li>
            <li>Engineered a SIMD-optimized, multithreaded CPU raytracer for voxel scenes, designed for seamless integration into graphics engines, enhancing both visual fidelity and performance <a className="alink" href="https://github.com/platonvin/rave">Repository</a> (C99)</li>
            <li>Implemented a subpass-based deferred rendering system, optimized for Tile-Based GPUs with advanced compression techniques, achieving significant performance gains in complex scenes in comparison with common methods</li>
            <li>Designed a real-time GI system utilizing a custom ray-tracing algorithm and acceleration structure, providing dynamic low-frequency light simulation</li>
            <li>Integrated full-res ray-traced reflections for real-time rendering of glossy surfaces</li>
            <li>Developed a dynamic quality screen-space volumetric renderer incorporating Lambert's law and 3D Perlin noise, resulting in realistic volumetric lighting effects with constant runtime</li>
            <li>Created a GPU-driven foliage rendering system, capable of efficiently rendering hundreds of thouthands grass blades in hundreds of microseconds</li>
            <li>Implemented a state-of-art A-trous spatio-temporal denoising algorithm for filtering GI, achieving noise reduction in &lt;1 spp path-traced scenes</li>
          </ul>
        </li>
        <li>
          <strong>Lum-al</strong> — <a className="alink" href="https://github.com/platonvin/lum-al">Repository</a> (C++ Vulkan)
          <ul>
            <li>Architected a high-performance Vulkan framework, targeting init-time resource definitions</li>
            <li>Simplified resource management by applying specific usecase restrictions, resulting in an simple and lightweight system satisfying Lum requirements</li>
            <li>Implemented a generic CPU-GPU resource synchronization system, allowing preventing GPU stalls (aka parallelism)</li>
          </ul>
        </li>
        <li>
          <strong>Circuli-Bellum</strong> — <a className="alink" href="https://github.com/platonvin/Circuli-Bellum">Repository</a> (C++ Vulkan)
          <ul>
            <li>Developed ROUNDS clone in C++ Vulkan (with Lum-al), outperforming original game by an order of magnitude</li>
            <li>Engineered low-overdraw primitive shape rasterization algorithm with infinite antialiasing quality</li>
            <li>Designed fully GPU-driven precise 1D shadow technique while avoiding data duplication</li>
            <li>Implemented high-perfomance bloom and Chromatic abberation effects for better visuals</li>
          </ul>
        </li>
        <li>
          <strong>Mangaka</strong> — <a className="alink" href="https://github.com/platonvin/mangaka">Repository</a> (C++ Vulkan)
          <ul>
            <li>Developed a manga-style renderer utilizing Lum-al, capable of fast, high-quality stylized graphics suitable for manga-comics-style and animation</li>
            <li>Implemented outline rendering using Sobel-filter for normal and depth buffers, enabling accurate edge detection and stylized effects</li>
            <li>Engineered a mathematically-driven, multi-sampled dot and hatches rendering algorithms for traditional Manga shading look</li>
            <li>Created GLTF loader for easy integration with modern 3D workflows</li>
          </ul>
        </li>
        <li>
          <strong>Assembler</strong> — <a className="alink" href="https://github.com/platonvin/Assembler">Repository</a> (C99)
          <ul>
            <li>Developed a CPU emulator (Interpreter + compiler) with a custom instruction set, register architecture, and DOS-like drawing capabilities</li>
          </ul>
        </li>
        <li>
          <strong>Fractal Raymarcher</strong> — <a className="alink" href="https://github.com/platonvin/platonvin.github.io">Repository</a> | <a className="alink" href="https://platonvin.github.io/">Live Demo: click chevron on "Fractal Raymarcher"</a> (JavaScript)
          <ul>
            <li>Created a WebGL-based renderer for 4D Julia set fractals, utilizing different math-based techniques for distance field estimation, coloring and normals</li>
          </ul>
        </li>
      </ul>
      <h3>Educational info:</h3>
      <p>
        <strong>Applied Mathematics and Physics</strong> at Moscow Institute of Physics and Technology (MIPT), 2022 - 2023
      </p>
      <p>
        Gold medal on <strong>IAFPHO (International Al-Farghani Physics Olympiad)</strong>, 2021
        <p>... and multiple internal Belarus physics contest 1st places and diplomas</p>
      </p>
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Arial', sans-serif;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .CVcontact {
          display: flex;
          gap: 20px;
        }
        .CVcontact a {
          text-decoration: none;
          color: #333;
        }
        .icon {
          margin-right: 5px;
        }
        h1, h2, h3 {
        }
        .alink {
          color: #2aabee;
        }
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          margin-bottom: 10px;
        }
        strong {
          display: inline-block;
          margin-bottom: 5px;
        }
      `}</style>
    </div>
  );
};

export default CV;