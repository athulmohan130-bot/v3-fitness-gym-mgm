# PWA Icons

## Quick Start

This folder should contain your app icons in the following sizes:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons

### Option 1: Online Tool (Easiest)
1. Go to https://progressier.com/pwa-icons-and-ios-splash-screen-generator
2. Upload a single 512x512 PNG image of your logo
3. Download all generated sizes
4. Place them in this folder

### Option 2: Manual Creation
Use any image editor (Photoshop, GIMP, Canva) to create icons in each size.

## Icon Design Guidelines

- **Logo**: Use the V3 Fitness layers logo (from sidebar)
- **Background**: Solid color (#3b82f6 - primary blue)
- **Padding**: Leave 20-25% padding around the logo
- **Format**: PNG with transparency or solid background
- **Aspect Ratio**: 1:1 (square)

## Example Icon Structure

```
Your 512x512 icon should look like:
┌─────────────────────┐
│                     │
│    [V3 Fitness]     │
│      [Logo]         │
│                     │
└─────────────────────┘
```

## Testing

After adding icons:
1. Run `npm run build`
2. Run `npm start`
3. Open Chrome DevTools > Application > Manifest
4. Verify all icons are loaded correctly

## Current Status

⚠️ **Icons not yet created** - Please generate and add icons to enable full PWA functionality.
