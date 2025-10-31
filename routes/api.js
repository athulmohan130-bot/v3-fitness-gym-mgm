const express = require("express");
const log = require("../utils/logger");
const { scanForDevices } = require("../utils/networkScanner");
const DEVICE_CONFIG = require("../config/deviceConfig");

const router = express.Router();

// Middleware to get services from app context
const getServices = (req, res, next) => {
  req.deviceService = req.app.get("deviceService");
  req.io = req.app.get("io");
  next();
};

router.use(getServices);

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    server: "running",
    timestamp: new Date().toISOString(),
  });
});

router.get("/status", (req, res) => {
  const isMock = DEVICE_CONFIG.useMockDevice;
  res.json({
    connected: req.deviceService.isConnected(),
    deviceIp: isMock ? "mock-device" : DEVICE_CONFIG.ip,
    devicePort: isMock ? null : DEVICE_CONFIG.port,
    isMock,
    timestamp: new Date().toISOString(),
  });
});

router.get("/reconnect", async (req, res) => {
  log("info", "Manual reconnection triggered via API");
  const success = await req.deviceService.connectToDevice(req.io);
  res.json({
    success: success,
    connected: req.deviceService.isConnected(),
  });
});

router.get("/attendance/logs", async (req, res) => {
  const { isConnected, getZkInstance } = req.deviceService;
  if (DEVICE_CONFIG.useMockDevice) {
    return res.json({ success: true, message: "Mock device does not store historical logs." });
  }

  if (!isConnected() || !getZkInstance()) {
    return res.status(503).json({ error: "Device not connected" });
  }

  try {
    log("info", "Fetching attendance logs via API...");
    const logs = await getZkInstance().getAttendances();
    log("success", `Retrieved ${logs.data.length} attendance records`);
    res.json({
      success: true,
      count: logs.data.length,
      data: logs.data.map((logEntry) => ({
        userId: logEntry.userId,
        timestamp: logEntry.timestamp,
        deviceUserId: logEntry.deviceUserId,
        recordTime: logEntry.recordTime,
      })),
    });
  } catch (err) {
    log("error", "Failed to get attendance logs:", err.message);
    res.status(500).json({ error: "Failed to retrieve attendance logs", message: err.message });
  }
});

router.get("/device/info", async (req, res) => {
    const { isConnected, getZkInstance } = req.deviceService;
    if (DEVICE_CONFIG.useMockDevice) {
        return res.json({ success: true, message: "Mock device has no specific device info.", data: { mock: true, model: 'MockDevice-v1' } });
    }

    if (!isConnected() || !getZkInstance()) {
        return res.status(503).json({ error: "Device not connected" });
    }

    try {
        const info = await getZkInstance().getInfo();
        res.json({ success: true, data: info });
    } catch (err) {
        res.status(500).json({ error: "Failed to retrieve device information", message: err.message });
    }
});

router.get("/device/scan", async (req, res) => {
    try {
        log("info", "Device scan triggered via API...");
        const devices = await scanForDevices(false);
        
        if (devices.length === 0) {
            log("warn", "No devices found during network scan");
            return res.json({
                success: true,
                count: 0,
                devices: [],
                message: "No fingerprint devices found on the network. Ensure device is powered on and connected to the same network."
            });
        }
        
        log("success", `Found ${devices.length} device(s) during scan`);
        res.json({
            success: true,
            count: devices.length,
            devices: devices,
            message: `Found ${devices.length} device(s) with port 4370 open`
        });
    } catch (err) {
        log("error", "Device scan failed:", err.message);
        res.status(500).json({
            success: false,
            error: "Device scan failed",
            message: err.message
        });
    }
});

router.post("/polling/start", (req, res) => {
  req.deviceService.startPolling(req.io);
  res.json({ success: true, message: "Polling started" });
});

router.post("/polling/stop", (req, res) => {
  req.deviceService.stopPolling();
  res.json({ success: true, message: "Polling stopped" });
});

module.exports = router;

