const DEVICE_CONFIG = {
  // Set to true to use the mock device service for development without a physical device.
  useMockDevice: false,

  // Auto-discovery settings
  autoDiscoverDevice: true, // <-- Set to true to automatically scan for device on startup
  
  // Real device IP configuration (only used if useMockDevice is false and autoDiscoverDevice is false)
  ip: "192.168.1.15", // <-- Static IP (only used when auto-discovery is disabled)
  port: 4370,
  timeout: 10000,
  inactivityTimeout: 4000,

  // Network scanning settings (for auto-discovery)
  scanTimeout: 600,      // ms per connection attempt during scan
  scanConcurrency: 120,  // number of simultaneous connections during scan

  // Timezone configuration for attendance date calculation
  timezone: "Asia/Kolkata", // IST (UTC+5:30)
};

module.exports = DEVICE_CONFIG;
