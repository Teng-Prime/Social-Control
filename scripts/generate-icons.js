const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

// SVG content matching the updated AppLogo with the modern electric blue / cyan / purple palette
const svgContent = `
<svg width="512" height="512" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Main Primary Gradient: Purple -> Electric Blue -> Cyan -->
    <linearGradient id="logoGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7865FF" />
      <stop offset="50%" stop-color="#087BFF" />
      <stop offset="100%" stop-color="#00C8FF" />
    </linearGradient>

    <!-- Accent Flow Gradient: Cyan -> Blue -->
    <linearGradient id="logoGradAccent" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00C8FF" />
      <stop offset="100%" stop-color="#087BFF" />
    </linearGradient>

    <!-- Core Play Prism Gradient -->
    <linearGradient id="logoGradPrism" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#00C8FF" />
      <stop offset="50%" stop-color="#087BFF" />
      <stop offset="100%" stop-color="#7865FF" />
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Ambient Outer Halo -->
  <circle cx="50" cy="50" r="42" fill="url(#logoGradPrimary)" opacity="0.18" filter="url(#logoGlow)" />

  <!-- Outer Hexagonal Shield Path -->
  <path
    d="M50 8
       L86 28
       A6 6 0 0 1 89 33
       L89 67
       A6 6 0 0 1 86 72
       L50 92
       A6 6 0 0 1 47 92
       L14 72
       A6 6 0 0 1 11 67
       L11 33
       A6 6 0 0 1 14 28
       L47 8
       A6 6 0 0 1 50 8 Z"
    fill="#081024"
    stroke="url(#logoGradPrimary)"
    stroke-width="3.5"
    stroke-linejoin="round"
  />

  <!-- Inner Geometric Shield Highlight -->
  <path
    d="M50 16
       L80 33
       L80 67
       L50 84
       L20 67
       L20 33 Z"
    fill="#0E1E3D"
    opacity="0.9"
  />

  <!-- Stylized 'S' Flow / Dynamic Social Wave -->
  <path
    d="M32 35
       C32 26, 68 22, 68 35
       C68 44, 32 46, 32 58
       C32 72, 68 68, 68 60"
    stroke="url(#logoGradAccent)"
    stroke-width="6"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Forward Video Play Prism / Apex Triangle -->
  <path
    d="M44 38
       L64 50
       L44 62
       Z"
    fill="url(#logoGradPrism)"
    filter="url(#logoGlow)"
  />

  <!-- AI Innovation Spark Star (Top Right) -->
  <path
    d="M72 20
       L74 25
       L79 27
       L74 29
       L72 34
       L70 29
       L65 27
       L70 25 Z"
    fill="#FDE047"
  />

  <!-- Ambient Center Core Spark -->
  <circle cx="50" cy="50" r="3.2" fill="#FFFFFF" opacity="0.95" />
</svg>
`.trim();

/**
 * Packs multiple PNG buffers into a single ICO file buffer.
 * Supports standard PNG-based ICO entries (Windows Vista / 7 / 10 / 11).
 */
function createIco(pngBuffersWithSize) {
  const count = pngBuffersWithSize.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalDirSize = headerSize + count * dirEntrySize;

  let currentOffset = totalDirSize;
  const dirBuffers = [];
  const imageBuffers = [];

  for (const { size, buffer } of pngBuffersWithSize) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width: 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height: 0 means 256
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(currentOffset, 12); // File offset

    dirBuffers.push(entry);
    imageBuffers.push(buffer);
    currentOffset += buffer.length;
  }

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Image type: 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  return Buffer.concat([header, ...dirBuffers, ...imageBuffers]);
}

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      transparent: true,
      frame: false,
      webPreferences: {
        offscreen: false,
      },
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 512px; height: 512px; background: transparent; overflow: hidden; }
            svg { width: 512px; height: 512px; display: block; }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `;

    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    // Small delay to ensure rendering and SVG filters are executed
    await new Promise((resolve) => setTimeout(resolve, 500));

    const masterImage = await win.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
    win.close();

    const sizes = [256, 128, 64, 48, 32, 16];
    const pngBuffersWithSize = [];

    const resourcesDir = path.join(__dirname, '../resources');
    const buildDir = path.join(__dirname, '../build');
    const publicDir = path.join(__dirname, '../src/renderer/public');

    [resourcesDir, buildDir, publicDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Save 512x512 master PNG
    const master512Buffer = masterImage.toPNG();
    fs.writeFileSync(path.join(resourcesDir, 'icon-512.png'), master512Buffer);

    // Generate sized PNGs
    for (const size of sizes) {
      const resized = masterImage.resize({ width: size, height: size, quality: 'best' });
      const buf = resized.toPNG();
      pngBuffersWithSize.push({ size, buffer: buf });
    }

    // Save primary 256x256 PNG to build & resources
    const png256 = pngBuffersWithSize.find((item) => item.size === 256).buffer;
    fs.writeFileSync(path.join(resourcesDir, 'icon.png'), png256);
    fs.writeFileSync(path.join(buildDir, 'icon.png'), png256);
    fs.writeFileSync(path.join(publicDir, 'icon.png'), png256);

    // Create and save multi-resolution ICO
    const icoBuffer = createIco(pngBuffersWithSize);
    fs.writeFileSync(path.join(resourcesDir, 'icon.ico'), icoBuffer);
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

    console.log('SUCCESS: Icons generated successfully!');
    console.log('- resources/icon.ico (' + icoBuffer.length + ' bytes)');
    console.log('- resources/icon.png (' + png256.length + ' bytes)');
    console.log('- build/icon.ico');
    console.log('- build/icon.png');
    console.log('- src/renderer/public/icon.png');

    app.exit(0);
  } catch (err) {
    console.error('ERROR generating icons:', err);
    app.exit(1);
  }
});
