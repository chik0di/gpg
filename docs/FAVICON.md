# GetPrimeGrade Favicon & Icon System

## Overview

GetPrimeGrade uses a comprehensive favicon and icon system that works across all browsers, devices, and platforms. The icons feature the brand's navy background (`#1B2E4B`) with a white 'G' letter.

## Files Generated

### App Directory (Next.js File-based Metadata)
- `app/icon.svg` - Primary favicon (32×32, auto-served by Next.js)
- `app/apple-icon.svg` - Apple touch icon (180×180, auto-served by Next.js)
- `app/opengraph-image.tsx` - Dynamic OG image generator (1200×630)

### Public Directory (Fallbacks & PWA)
- `public/favicon.ico` - Legacy favicon for older browsers
- `public/favicon-16x16.png` - Small favicon
- `public/favicon-32x32.png` - Standard favicon
- `public/apple-touch-icon.png` - iOS home screen icon (180×180)
- `public/android-chrome-192x192.png` - Android icon (192×192)
- `public/android-chrome-512x512.png` - Android icon (512×512)
- `public/icon.svg` - SVG fallback
- `public/apple-icon.svg` - Apple SVG fallback
- `public/site.webmanifest` - PWA manifest file

## Browser Support

✅ **Modern Browsers** (Chrome, Firefox, Safari, Edge)  
Uses SVG icons from `app/` directory via Next.js metadata API

✅ **iOS Safari & Home Screen**  
Uses `apple-touch-icon.png` and `apple-icon.svg`

✅ **Android Chrome & PWA**  
Uses `android-chrome-*.png` icons defined in `site.webmanifest`

✅ **Legacy Browsers** (IE11, Old Safari)  
Falls back to `favicon.ico` and PNG versions

## Regenerating Icons

If you need to update the favicon design:

1. Edit the SVG templates in `app/icon.svg` and `app/apple-icon.svg`
2. Run the generator script:
   ```bash
   npm run generate:favicons
   ```

This will regenerate all PNG versions in the `public/` directory.

## How It Works

### Next.js File-based Metadata
Next.js 14+ automatically detects and serves:
- `app/icon.svg` → `/icon` route
- `app/apple-icon.svg` → `/apple-icon` route
- `app/opengraph-image.tsx` → `/opengraph-image` route

### Metadata Configuration
The `app/layout.tsx` file contains comprehensive metadata that references both:
- File-based icons (auto-served by Next.js)
- Public directory fallbacks (for maximum compatibility)

### PWA Support
The `site.webmanifest` file enables Progressive Web App features:
- Add to home screen on mobile
- App-like experience
- Custom app icon and theme colors

## Design Specifications

- **Background Color**: `#1B2E4B` (Navy - GetPrimeGrade brand)
- **Text Color**: `white`
- **Font**: System UI (bold, 700 weight)
- **Letter**: 'G'
- **Border Radius**: 18.75% of size (rounded square)
- **Theme Color**: `#1B2E4B` (PWA)
- **Background**: `#FDFAF6` (Cream - brand background)

## Testing Checklist

- [ ] Browser tab shows 'G' icon
- [ ] Bookmark/favorites shows correct icon
- [ ] iOS home screen shows rounded icon
- [ ] Android home screen shows icon
- [ ] Twitter/Discord link previews show OG image
- [ ] PWA install shows proper app icon
