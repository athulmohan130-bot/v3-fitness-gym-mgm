const express = require("express");
const http = require("http");
const log = require("./utils/logger");
const { findFirstDevice } = require("./utils/networkScanner");
const initializeSocket = require("./services/socketService");
const apiRoutes = require("./routes/api");
const userManagementRoutes = require("./routes/userManagement");
const { initializeMemberEnrollmentListener } = require("./services/memberEnrollmentService");
const DEVICE_CONFIG = require("./config/deviceConfig");

const deviceService = DEVICE_CONFIG.useMockDevice
  ? require("./services/mockDeviceService")
  : require("./services/deviceService");

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

app.set("io", io);
app.set("deviceService", deviceService);

app.use(express.json());
app.use("/", apiRoutes);
app.use("/users", userManagementRoutes);

async function gracefulShutdown(signal) {
  log("info", `${signal} received. Starting graceful shutdown...`);
  deviceService.stopPolling();

  server.close(() => {
    log("info", "HTTP server closed");
  });

  await deviceService.disconnectFromDevice();

  io.close(() => {
    log("info", "Socket.io server closed");
  });

  log("success", "Shutdown complete");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

const PORT = process.env.PORT || 5001;

server.listen(PORT, async () => {
  console.log("\n" + "=".repeat(70));
  log("success", `🚀 Server started successfully on port ${PORT}`);
  console.log("=".repeat(70));
  log("info", `📊 API Endpoints:`);
  console.log(`   • Health:        http://localhost:${PORT}/health`);
  console.log(`   • Status:        http://localhost:${PORT}/status`);
  console.log(`   • Reconnect:     http://localhost:${PORT}/reconnect`);
  console.log(`   • Device Info:   http://localhost:${PORT}/device/info`);
  console.log(`   • Device Scan:   http://localhost:${PORT}/device/scan`);
  console.log(`   • All Logs:      http://localhost:${PORT}/attendance/logs`);
  console.log(`   • Latest Log:    http://localhost:${PORT}/test/latest`);
  console.log(
    `   • Start Polling: POST http://localhost:${PORT}/polling/start`
  );
  console.log(`   • Stop Polling:  POST http://localhost:${PORT}/polling/stop`);
  console.log(`\n   👥 User Management:`);
  console.log(`   • Get Users:     http://localhost:${PORT}/users`);
  console.log(`   • Add User:      POST http://localhost:${PORT}/users/add`);
  console.log(`   • Delete User:   DELETE http://localhost:${PORT}/users/:userId`);
  console.log("=".repeat(70) + "\n");

  // Auto-discover device if enabled
  let deviceIP = DEVICE_CONFIG.ip;
  let shouldConnect = true;
  
  if (!DEVICE_CONFIG.useMockDevice && DEVICE_CONFIG.autoDiscoverDevice) {
    log("info", "");
    log("info", "🔍 Auto-discovery enabled. Scanning network for fingerprint device...");
    const discoveredIP = await findFirstDevice(true);
    
    if (discoveredIP) {
      deviceIP = discoveredIP;
      log("success", `✅ Device discovered at ${deviceIP}`);
      // Update the config for this session
      DEVICE_CONFIG.ip = deviceIP;
    } else {
      log("error", "❌ No device found during network scan!");
      log("error", "Connection unsuccessful. Please ensure:");
      log("error", "  1. The fingerprint device is powered on");
      log("error", "  2. The device is connected to the same network");
      log("error", "  3. No firewall is blocking port 4370");
      log("error", "  4. AP/Client isolation is disabled on your router");
      log("info", "");
      log("info", "💡 You can:");
      log("info", "  • Check your router's DHCP/connected devices list");
      log("info", "  • Manually scan again: GET http://localhost:5001/device/scan");
      log("info", "  • Set autoDiscoverDevice: false in config and use a static IP");
      shouldConnect = false;
    }
    log("info", "");
  }

  if (shouldConnect) {
    const connectionMessage = DEVICE_CONFIG.useMockDevice
      ? "Initiating connection to MOCK device..."
      : `Initiating connection to eSSL K30 Pro device at ${deviceIP}...`;
    log("info", connectionMessage);

    const connected = await deviceService.connectToDevice(io);

    if (connected) {
    // Initialize Firebase Realtime Database listener for auto-enrollment
    if (!DEVICE_CONFIG.useMockDevice) {
      log("info", "");
      log("info", "🎯 Initializing auto-enrollment from Firebase Realtime Database...");
      initializeMemberEnrollmentListener(deviceService);
    }

    if (DEVICE_CONFIG.useMockDevice) {
      log("info", "");
      log("info", "🔥 Mock device is active.");
      log("info", "Attendance events will be generated automatically every 3 seconds.");
      log("info", "");
      deviceService.startPolling(io);
    } else {
      log("info", "");
      log("info", "✋ TESTING INSTRUCTIONS:");
      log("info", "1. Scan your fingerprint on the K30 Pro device");
      log("info", "2. Watch this console for real-time events");
      log(
        "info",
        "3. If no events appear, polling will catch them (5 sec intervals)"
      );
      log("info", "4. New members will be auto-enrolled from Firebase");
      log("info", "");

      setTimeout(() => {
        log("info", "Starting backup polling mechanism...");
        deviceService.startPolling(io);
      }, 10000);
    }
    }
  }
});


