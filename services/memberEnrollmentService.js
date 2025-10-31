const { realtimeDb } = require("../config/firebaseConfig");
const log = require("../utils/logger");

let deviceService = null;

/**
 * Initialize the member enrollment listener
 * @param {object} deviceSvc - The device service instance to use for enrollment
 */
function initializeMemberEnrollmentListener(deviceSvc) {
  deviceService = deviceSvc;

  const registrationsRef = realtimeDb.ref("member_registrations");

  log("info", "🎧 Starting Firebase Realtime Database listener for member registrations...");

  // Listen for new member registrations
  registrationsRef.on("child_added", async (snapshot) => {
    const memberData = snapshot.val();
    const registrationId = snapshot.key;

    // Skip if already enrolled
    if (memberData.esslEnrolled === true) {
      log("debug", `Member ${memberData.name} already enrolled, skipping...`);
      return;
    }

    log("info", `📝 New member registration detected: ${memberData.name} (ID: ${memberData.biometricDeviceId})`);

    try {
      // Enroll the member in the ESSL device
      await enrollMemberInDevice(memberData, registrationId, snapshot.ref);
    } catch (error) {
      const errorMsg = error?.message || error?.toString() || "Unknown error occurred";
      log("error", `Failed to process enrollment for ${memberData.name}:`, errorMsg);
    }
  });

  log("success", "✅ Member enrollment listener active!");
}

/**
 * Enroll a member in the ESSL biometric device
 * @param {object} memberData - Member data from Realtime Database
 * @param {string} registrationId - The registration ID
 * @param {object} snapshotRef - Reference to update status
 */
async function enrollMemberInDevice(memberData, registrationId, snapshotRef) {
  const zkInstance = deviceService.getZkInstance();

  // Check if device is connected
  if (!deviceService.isConnected() || !zkInstance) {
    log("warning", `Cannot enroll ${memberData.name} - ESSL device not connected`);

    // Update status in Firebase
    await snapshotRef.update({
      esslEnrolled: false,
      esslStatus: "failed",
      esslError: "Device not connected",
      esslAttemptedAt: new Date().toISOString(),
    });

    return;
  }

  try {
    log("info", `🔄 Enrolling ${memberData.name} in ESSL device...`);

    // Enroll user in the biometric device
    // Parameters: uid, userid, name, password, role, cardno
    await zkInstance.setUser(
      parseInt(memberData.biometricDeviceId), // uid - unique user ID (number)
      memberData.biometricDeviceId.toString(), // userid - user ID as string
      memberData.name || "", // name - user's name
      "", // password - optional password
      0, // role - 0=user, 14=admin
      0 // cardno - card number if using RFID
    );

    log("success", `✅ Successfully enrolled ${memberData.name} in ESSL device!`);

    // Update status in Firebase
    await snapshotRef.update({
      esslEnrolled: true,
      esslEnrolledAt: new Date().toISOString(),
      esslStatus: "success",
    });

    log("success", `✅ Updated enrollment status in Firebase for ${memberData.name}`);
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || "Unknown error occurred";
    log("error", `❌ Failed to enroll ${memberData.name}:`, errorMsg);

    // Update with error status
    await snapshotRef.update({
      esslEnrolled: false,
      esslStatus: "failed",
      esslError: errorMsg,
      esslAttemptedAt: new Date().toISOString(),
    });
  }
}

module.exports = {
  initializeMemberEnrollmentListener,
};
