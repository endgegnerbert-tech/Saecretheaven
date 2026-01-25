#!/usr/bin/env node

/**
 * Generate PWA icons from SVG template
 * This script creates placeholder icons for development
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ICON_SIZES = [
  { name: "icon-32x32.png", size: 32 },
  { name: "icon-72x72.png", size: 72 },
  { name: "icon-96x96.png", size: 96 },
  { name: "icon-128x128.png", size: 128 },
  { name: "icon-144x144.png", size: 144 },
  { name: "icon-152x152.png", size: 152 },
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-384x384.png", size: 384 },
  { name: "icon-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "shortcut-gallery.png", size: 96 },
  { name: "shortcut-backup.png", size: 96 },
];

const SPLASH_SIZES = [
  { name: "apple-splash-2048-2732.png", width: 2048, height: 2732 },
  { name: "apple-splash-1170-2532.png", width: 1170, height: 2532 },
  { name: "apple-splash-1284-2778.png", width: 1284, height: 2778 },
];

async function generateIcons() {
  const iconsDir = path.join(__dirname, "../public/icons");
  const splashDir = path.join(__dirname, "../public/splash");

  // Ensure directories exist
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
  if (!fs.existsSync(splashDir)) fs.mkdirSync(splashDir, { recursive: true });

  // Read SVG template
  const svgPath = path.join(iconsDir, "icon-template.svg");
  if (!fs.existsSync(svgPath)) {
    console.error("SVG template not found. Creating default template...");
    const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" rx="20" fill="#007AFF"/>
      <path d="M20 20 L80 20 L80 80 L20 80 Z" fill="white" stroke="#007AFF" stroke-width="2"/>
      <path d="M30 30 L70 30 L70 70 L30 70 Z" fill="#007AFF" stroke="white" stroke-width="1"/>
      <text x="50" y="55" font-family="Arial" font-size="8" fill="white" text-anchor="middle">PV</text>
    </svg>`;
    fs.writeFileSync(svgPath, defaultSvg);
  }

  const svgContent = fs.readFileSync(svgPath);

  console.log("Generating icons...");

  // Generate square icons
  for (const { name, size } of ICON_SIZES) {
    try {
      await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, name));
      console.log(`✓ Generated ${name}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  }

  console.log("Generating splash screens...");

  // Generate splash screens (simple blue background with logo)
  for (const { name, width, height } of SPLASH_SIZES) {
    try {
      await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 0, g: 122, b: 255, alpha: 1 },
        },
      })
        .composite([
          {
            input: Buffer.from(svgContent),
            top: Math.floor(height / 2) - 50,
            left: Math.floor(width / 2) - 50,
          },
        ])
        .png()
        .toFile(path.join(splashDir, name));
      console.log(`✓ Generated ${name}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  }

  console.log("Icon generation complete!");
}

// Check if sharp is installed, if not install it
try {
  require.resolve("sharp");
  generateIcons();
} catch (error) {
  console.log("sharp module not found. Installing...");
  require("child_process").execSync("npm install sharp", { stdio: "inherit" });
  generateIcons();
}
