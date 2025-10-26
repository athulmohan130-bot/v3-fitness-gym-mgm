# PWA Setup Guide for V3 Fitness

## ✅ What's Already Configured

1. **next-pwa** package installed
2. **next.config.ts** configured with PWA settings
3. **manifest.json** created with app metadata
4. **Meta tags** added to app layout for PWA support

## 📱 PWA Features Enabled

- **Offline Support**: Service worker will cache assets for offline use
- **Install Prompt**: Users can install the app on their device
- **Standalone Mode**: App runs without browser UI when installed
- **Theme Color**: Branded color (#3b82f6) for status bar
- **Mobile Optimized**: Full viewport coverage and touch-friendly

## 🎨 Create PWA Icons

You need to create app icons in the following sizes and place them in `/public/icons/`:

### Required Icon Sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

### Easy Way to Generate Icons:

1. **Create a single 512x512 base icon** with your V3 Fitness logo
2. Use an online tool to generate all sizes:
   - [PWA Asset Generator](https://progressier.com/pwa-icons-and-ios-splash-screen-generator)
   - [PWABuilder Image Generator](https://www.pwabuilder.com/imageGenerator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)

3. Download and place all icons in `/public/icons/` folder

### Icon Design Tips:
- Use your V3 Fitness logo (the layers icon from sidebar)
- Ensure 20-25% padding around the logo
- Use a solid background color (primary blue: #3b82f6)
- Make sure the logo is clearly visible at small sizes
- Icons should be square (1:1 aspect ratio)

## 🚀 Testing Your PWA

### Development Mode
PWA is disabled in development to avoid caching issues during development.

### Production Build
1. Build your app:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

3. Test PWA features:
   - Open Chrome DevTools > Application > Manifest
   - Check "Service Workers" section
   - Look for "Install App" button in address bar (desktop)
   - On mobile, browser will show "Add to Home Screen" prompt

### Lighthouse PWA Audit
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App"
4. Run audit to see PWA score

## 📋 PWA Checklist

- [x] Service worker registered
- [x] Manifest.json created
- [x] Meta tags added
- [x] Theme color set
- [x] Offline support enabled
- [ ] Icons created (you need to do this)
- [ ] Tested on mobile device
- [ ] Tested install prompt
- [ ] Tested offline functionality

## 🔧 Configuration Details

### Manifest Location
`/public/manifest.json`

### Service Worker
Auto-generated in `/public/` on build:
- `sw.js` - Service worker file
- `workbox-*.js` - Workbox runtime

### Config (next.config.ts)
```typescript
withPWA({
  dest: "public",           // Service worker destination
  register: true,           // Auto-register service worker
  skipWaiting: true,        // Activate immediately
  disable: isDevelopment,   // Disabled in dev mode
})
```

## 📱 Supported Platforms

- ✅ Chrome (Desktop & Mobile)
- ✅ Edge
- ✅ Safari (iOS 16.4+)
- ✅ Firefox
- ✅ Samsung Internet
- ✅ Opera

## 🎯 Next Steps

1. **Create Icons**: Generate and place icons in `/public/icons/`
2. **Test Build**: Run production build and test install
3. **Mobile Test**: Test on actual mobile devices
4. **Deploy**: PWA works best when deployed with HTTPS

## 📚 Resources

- [Next PWA Docs](https://github.com/shadowwalker/next-pwa)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker Guide](https://web.dev/service-worker-mindset/)
- [Manifest Reference](https://web.dev/add-manifest/)

## 🐛 Troubleshooting

### Service Worker Not Registering
- Make sure you're in production mode (`npm run build && npm start`)
- Check browser console for errors
- Ensure HTTPS is used (localhost is okay for testing)

### Icons Not Showing
- Verify icons exist in `/public/icons/`
- Check manifest.json icon paths
- Clear browser cache and reload

### Install Prompt Not Appearing
- PWA criteria must be met (HTTPS, manifest, service worker, icons)
- Some browsers show prompt after user engagement
- Can be manually triggered via browser menu

## 🎉 Success!

Once icons are added and tested, your V3 Fitness app will be a fully functional PWA that users can install on their devices!
