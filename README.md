# ZK Attendance Monitor

A powerful middleware and desktop application for ZK Teco fingerprint devices with real-time attendance monitoring, auto-enrollment, and Firebase integration.

## 🌟 Features

- ✨ **Desktop Application** - Beautiful cross-platform Electron app with modern UI
- 🔄 **Real-time Monitoring** - Live attendance events via Socket.IO
- 📡 **Auto-Discovery** - Automatically find devices on your network
- 🔥 **Firebase Integration** - Auto-enrollment from Firebase Realtime Database
- 📊 **Live Statistics** - Track attendance events in real-time
- 🎯 **Mock Mode** - Development mode without physical device
- 🌐 **REST API** - Full-featured API for integration
- 👥 **User Management** - Add, delete, and manage users
- 🔍 **Network Scanner** - Find devices across your local network

## 🚀 Quick Start

### Installation

```bash
# Clone or download the repository
cd Middleware

# Install dependencies
npm install
```

### Choose Your Mode

#### Option 1: Desktop Application (Recommended)

Run the modern desktop app with GUI:

```bash
npm run electron
```

**Features:**
- Beautiful dark-themed interface
- Real-time event visualization
- System tray integration
- Network scanner built-in
- One-click device discovery

See [ELECTRON_APP.md](ELECTRON_APP.md) for complete desktop app documentation.

#### Option 2: Command-Line Interface

Run as a traditional Node.js server:

```bash
npm start
```

**Features:**
- Headless operation
- Perfect for servers
- Lower resource usage
- All API endpoints available

## 📦 Building Desktop App

### For Your Platform

```bash
npm run build
```

### For Specific Platforms

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux

# All platforms
npm run dist
```

Built applications will be in the `dist/` folder.

## ⚙️ Configuration

Edit `config/deviceConfig.js`:

```javascript
const DEVICE_CONFIG = {
  // Development mode (no physical device needed)
  useMockDevice: false,
  
  // Auto-discover device on network
  autoDiscoverDevice: true,
  
  // Static IP (only used when auto-discovery is disabled)
  ip: "192.168.1.15",
  port: 4370,
  
  // Connection settings
  timeout: 10000,
  inactivityTimeout: 4000,
  
  // Network scanning (for auto-discovery)
  scanTimeout: 600,
  scanConcurrency: 120,
  
  // Timezone for attendance
  timezone: "Asia/Kolkata"
};
```

## 🔌 API Endpoints

When running (either mode), the server provides these endpoints:

### Device Management
- `GET /health` - Server health check
- `GET /status` - Connection status
- `GET /reconnect` - Reconnect to device
- `GET /device/info` - Device information
- `GET /device/scan` - Scan network for devices

### Attendance
- `GET /attendance/logs` - All attendance records
- `GET /test/latest` - Latest attendance record

### Polling Control
- `POST /polling/start` - Start polling
- `POST /polling/stop` - Stop polling

### User Management
- `GET /users` - List all users
- `POST /users/add` - Add new user
- `DELETE /users/:userId` - Delete user

## 📡 Device Discovery

The application can automatically find ZK fingerprint devices on your network:

### Automatic (on startup)
Set `autoDiscoverDevice: true` in config and the app will scan your network on startup.

### Manual (via API)
```bash
curl http://localhost:5001/device/scan
```

### Manual (via Desktop UI)
Click "Scan Network" button in the device panel.

See [DEVICE_DISCOVERY.md](DEVICE_DISCOVERY.md) for detailed documentation.

## 🎨 Desktop App Interface

### Main Features
- **Header** - Connection status and app info
- **Device Panel** - Connection info, scan, and reconnect
- **Live Events** - Real-time attendance stream
- **Statistics** - Event counters
- **Configuration** - Current settings display

### System Tray
The app minimizes to system tray instead of closing completely. Right-click the tray icon to fully quit.

## 🔥 Firebase Integration

The application supports auto-enrollment from Firebase Realtime Database:

1. Set up Firebase Admin SDK credentials
2. Configure in `services/memberEnrollmentService.js`
3. Users added to Firebase are automatically enrolled to the device

## 🧪 Development Mode

Test without a physical device:

```javascript
// config/deviceConfig.js
const DEVICE_CONFIG = {
  useMockDevice: true,  // Enable mock mode
  // ... other settings
};
```

Mock mode generates:
- Simulated attendance events every 3 seconds
- Random user IDs
- Realistic timestamps

## 📁 Project Structure

```
Middleware/
├── config/              # Configuration files
│   └── deviceConfig.js
├── electron/            # Desktop app files
│   ├── main.js         # Electron main process
│   ├── preload.js      # IPC bridge
│   ├── index.html      # UI structure
│   ├── styles.css      # Styling
│   └── renderer.js     # UI logic
├── routes/              # API routes
│   ├── api.js
│   └── userManagement.js
├── services/            # Business logic
│   ├── deviceService.js
│   ├── mockDeviceService.js
│   ├── socketService.js
│   └── memberEnrollmentService.js
├── utils/               # Utilities
│   ├── logger.js
│   ├── dateUtils.js
│   └── networkScanner.js
└── middleware.js        # CLI entry point
```

## 🐛 Troubleshooting

### Device Not Found

1. Ensure device is powered on
2. Check device is on same network
3. Verify no firewall blocking port 4370
4. Disable AP/client isolation on router
5. Try manual scan: `GET /device/scan`

### Desktop App Won't Start

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Connection Failed

1. Check `config/deviceConfig.js` settings
2. Verify device IP is correct
3. Try disabling auto-discovery and use static IP
4. Check device is not in use by another application

## 📚 Documentation

- [ELECTRON_APP.md](ELECTRON_APP.md) - Complete desktop app guide
- [DEVICE_DISCOVERY.md](DEVICE_DISCOVERY.md) - Network scanning documentation

## 🔐 Security

Desktop app security features:
- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC communication via preload script
- Content Security Policy headers

## 🛠️ Technology Stack

- **Electron** - Desktop application framework
- **Express.js** - REST API server
- **Socket.IO** - Real-time communication
- **zkteco-js** - ZK device SDK
- **Firebase Admin** - Database integration
- **Node.js** - Runtime environment

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 💡 Tips

### Desktop App
- Use `Ctrl/Cmd + R` to reload the window
- Press `F12` to open developer tools
- App runs in system tray - right-click to quit

### CLI Mode
- Server runs on port 5001 by default
- Use `PORT` environment variable to change
- Press `Ctrl+C` for graceful shutdown

### Network Performance
- Scan takes ~2-5 seconds for /24 subnet
- Adjust `scanConcurrency` in config for faster scans
- Lower `scanTimeout` for quicker (but less reliable) scans

## 🎉 Credits

Built with love for ZK Teco K30 Pro and compatible devices.
