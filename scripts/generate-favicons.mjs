#!/usr/bin/env node

import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgTemplate = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.1875}" fill="#1B2E4B"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.05}" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="${size * 0.625}" font-weight="700">G</text>
</svg>`;

const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
];

const publicDir = path.join(__dirname, '..', 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating GetPrimeGrade favicons...\n');

sizes.forEach(({ size, name }) => {
  try {
    const svg = svgTemplate(size);
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: size,
      },
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    const outputPath = path.join(publicDir, name);
    fs.writeFileSync(outputPath, pngBuffer);

    console.log(`✓ Generated ${name} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${name}:`, error.message);
  }
});

console.log('\n✓ All favicon PNG files generated successfully!');
console.log('📁 Files saved to: public/');
console.log('\nNext.js will automatically use these files from app/icon.svg and app/apple-icon.svg');
