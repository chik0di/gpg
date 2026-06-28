#!/usr/bin/env node

/**
 * Generate favicon PNG files using Canvas (for browsers that don't support SVG favicons)
 * Run with: node scripts/generate-favicon.js
 */

const fs = require('fs');
const path = require('path');

// Try to use canvas if available, otherwise just rely on SVG
try {
  const { createCanvas } = require('canvas');

  function generateFavicon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Navy background with rounded corners
    const cornerRadius = size * 0.1875; // 6/32 ratio from SVG
    ctx.fillStyle = '#1B2E4B';
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(size - cornerRadius, 0);
    ctx.quadraticCurveTo(size, 0, size, cornerRadius);
    ctx.lineTo(size, size - cornerRadius);
    ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
    ctx.lineTo(cornerRadius, size);
    ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    ctx.fill();

    // White 'G' text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.625}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('G', size / 2, size / 2 + size * 0.05);

    // Save PNG
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, '..', 'public', filename);
    fs.writeFileSync(outputPath, buffer);
    console.log(`✓ Generated ${filename} (${size}x${size})`);
  }

  // Ensure public directory exists
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Generate different sizes
  generateFavicon(32, 'favicon-32x32.png');
  generateFavicon(16, 'favicon-16x16.png');
  generateFavicon(180, 'apple-touch-icon.png');
  generateFavicon(192, 'android-chrome-192x192.png');
  generateFavicon(512, 'android-chrome-512x512.png');

  console.log('\n✓ All favicon PNG files generated successfully!');
  console.log('Note: SVG favicons (icon.svg, apple-icon.svg) are already in app/ directory');

} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.log('⚠ Canvas module not found. Skipping PNG generation.');
    console.log('SVG favicons will work in modern browsers.');
    console.log('\nTo generate PNG fallbacks, run: npm install canvas');
  } else {
    console.error('Error generating favicons:', err);
  }
}
