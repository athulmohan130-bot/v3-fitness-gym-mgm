const ZKLib = require("zkteco-js");
const DEVICE_CONFIG = require("../config/deviceConfig");
const log = require("../utils/logger");
const { saveAttendanceRecord } = require("./firestoreService");
const { getUserByBiometricId } = require("./userService");
const { getDateInTimezone } = require("../utils/dateUtils");

let zk = null;
let isConnected = false;
let pollingInterval = null;
let lastLogCount = 0;
let realtimeListenerSetup = false;

// Helper to process and enrich attendance data
async function processAndSaveRecord(rawRecord, source, io) {
  const now = new Date();
  const timestamp = rawRecord.timestamp || rawRecord.recordTime || now.toISOString();
  
  // Validate userId exists
  if (!rawRecord.userId && rawRecord.userId !== 0) {
    log("warning", `⚠️ Invalid attendance event - no userId provided`, rawRecord);
    return; // Skip invalid events
  }
  
  const biometricId = String(rawRecord.userId);
  
  // Query user by biometricDeviceId
  const userDetails = await getUserByBiometricId(biometricId);

  let attendanceRecord;

  // If user not found, create record with unknown user
  if (!userDetails) {
    log("warning", `⚠️ Unknown user - biometricDeviceId: ${biometricId} (not in database)`);
    
    // Still create and emit event for UI display
    attendanceRecord = {
      userId: `unknown_${biometricId}`,
      name: `Unknown User (ID: ${biometricId})`,
      profileImageUrl: "",
      biometricDeviceId: biometricId,
      checkInTime: timestamp,
      checkOutTime: null,
      date: getDateInTimezone(timestamp, DEVICE_CONFIG.timezone),
      status: "present",
      source: "essl",
      membershipPlanId: null,
      membershipStatus: "unknown",
      remarks: `Entry from ${source} - User not found in database`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    log("event", `📥 Attendance event for unknown user: ${biometricId}`, attendanceRecord);
    
    // Emit to UI but don't save to Firestore
    io.emit("attendance_event", attendanceRecord);
    return;
  }

  // User found - create full record
  attendanceRecord = {
    userId: userDetails.id, // Use the Firestore document ID as userId
    name: userDetails.name,
    profileImageUrl: userDetails.profileImageUrl || "",
    biometricDeviceId: userDetails.biometricDeviceId,
    checkInTime: timestamp,
    checkOutTime: null,
    date: getDateInTimezone(timestamp, DEVICE_CONFIG.timezone),
    status: "present",
    source: "essl",
    membershipPlanId: userDetails.membershipPlanId || null,
    membershipStatus: userDetails.membershipStatus || "inactive",
    remarks: `Entry recorded from ${source}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  log("event", `✅ Processed attendance record for user: ${attendanceRecord.name}`, attendanceRecord);
  
  io.emit("attendance_event", attendanceRecord);
  await saveAttendanceRecord(attendanceRecord);
}

async function connectToDevice(io) {
  try {
    log("info", `Attempting to connect to eSSL K30 Pro at ${DEVICE_CONFIG.ip}:${DEVICE_CONFIG.port}...`);
    zk = new ZKLib(DEVICE_CONFIG.ip, DEVICE_CONFIG.port, DEVICE_CONFIG.timeout, DEVICE_CONFIG.inactivityTimeout);
    await zk.createSocket();
    
    // Increase max listeners to prevent warnings
    if (zk.socket && zk.socket.setMaxListeners) {
      zk.socket.setMaxListeners(30);
    }
    
    log("success", "Successfully connected to eSSL K30 Pro!");
    isConnected = true;

    try {
      const deviceInfo = await zk.getInfo();
      log("success", "Device information retrieved:", deviceInfo);
    } catch (infoErr) {
      log("warning", "Could not retrieve device info:", infoErr.message);
    }

    try {
      await zk.enableDevice();
      log("success", "Device real-time mode enabled");
    } catch (err) {
      log("warning", "Could not enable device (might already be enabled):", err.message);
    }

    setupRealtimeListener(io);
    io.emit("device_status", { connected: true, deviceIp: DEVICE_CONFIG.ip, timestamp: new Date().toISOString() });
    return true;
  } catch (err) {
    isConnected = false;
    log("error", "Failed to connect to device", { error: err.message, code: err.code || err.err?.code });
    return false;
  }
}

function setupRealtimeListener(io) {
  if (!zk) {
    log("error", "Cannot setup listener - device not connected");
    return;
  }

  // Prevent setting up multiple listeners
  if (realtimeListenerSetup) {
    log("debug", "Real-time listener already set up, skipping...");
    return;
  }

  log("info", "Setting up real-time attendance listener...");
  try {
    // Increase max listeners to prevent warnings
    const socket = zk.socket;
    if (socket && socket.setMaxListeners) {
      socket.setMaxListeners(20);
    }

    zk.getRealTimeLogs(async (data) => {
      // Log full raw data for debugging
      console.log("📥 Raw device data:", JSON.stringify(data));
      
      // Only process if it looks like a valid attendance event
      if (data && (data.userId || data.userId === 0)) {
        log("event", "🎯 Processing attendance event - User ID:", data.userId);
        await processAndSaveRecord(data, "essl-realtime", io);
      } else {
        // Log and skip non-attendance events (heartbeats, status, etc.)
        console.log("⚠️ Skipping non-attendance event:", data);
      }
    });
    
    realtimeListenerSetup = true;
    log("success", "Real-time listener activated");
  } catch (err) {
    log("error", "Failed to setup real-time listener:", err.message);
  }
}

async function pollAttendanceLogs(io) {
  if (!isConnected || !zk) return;

  try {
    const logs = await zk.getAttendances();
    if (logs.data.length > lastLogCount) {
      const newLogs = logs.data.slice(lastLogCount);
      log("event", `📥 New attendance logs detected (polling): ${newLogs.length} new records`);

      for (const log_entry of newLogs) {
        await processAndSaveRecord(log_entry, "essl-polling", io);
      }

      lastLogCount = logs.data.length;
    }
  } catch (err) {
    log("debug", "Polling error (normal if device is busy):", err.message);
  }
}

function startPolling(io) {
  if (pollingInterval) return;
  log("info", "Starting attendance log polling (10-second intervals) as backup...");
  pollingInterval = setInterval(() => pollAttendanceLogs(io), 10000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    log("info", "Polling stopped");
  }
}

async function disconnectFromDevice() {
  if (isConnected && zk) {
    try {
      log("info", "Disconnecting from device...");
      
      // Remove all listeners first
      if (zk.socket) {
        zk.socket.removeAllListeners();
      }
      
      // Try graceful disconnect first
      try {
        await zk.disconnect();
      } catch (disconnectErr) {
        // If graceful disconnect fails, force destroy the socket
        if (zk.socket && !zk.socket.destroyed) {
          zk.socket.destroy();
        }
      }
      
      realtimeListenerSetup = false; // Reset flag for potential reconnection
      isConnected = false;
      zk = null;
      
      log("success", "Device disconnected successfully");
    } catch (err) {
      log("error", "Error disconnecting:", err.message);
      // Ensure cleanup even on error
      isConnected = false;
      zk = null;
    }
  }
}

module.exports = {
  connectToDevice,
  startPolling,
  stopPolling,
  disconnectFromDevice,
  getZkInstance: () => zk,
  isConnected: () => isConnected,
};
