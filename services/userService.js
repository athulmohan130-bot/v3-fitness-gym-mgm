const { db } = require("../config/firebaseConfig");
const log = require("../utils/logger");

const USERS_COLLECTION = "users";

/**
 * Fetches user details from Firestore based on the biometric device ID.
 * Queries the 'users' collection for a document where biometricDeviceId matches the given ID.
 * @param {string} biometricDeviceId The biometric device ID from the attendance punch.
 * @returns {object|null} The user data or null if not found.
 */
async function getUserByBiometricId(biometricDeviceId) {
  if (!db) {
    log("error", "Firestore is not initialized. Cannot fetch user details.");
    return null;
  }

  try {
    const usersRef = db.collection(USERS_COLLECTION);
    const querySnapshot = await usersRef
      .where("biometricDeviceId", "==", String(biometricDeviceId))
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      log(
        "warning",
        `No user found with biometricDeviceId: ${biometricDeviceId}`
      );
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    log("info", `Fetched user details for biometricDeviceId: ${biometricDeviceId} - User: ${userData.name}`)
    
    return {
      id: userDoc.id,
      ...userData,
    };
  } catch (error) {
    log("error", `Failed to fetch user details for biometricDeviceId: ${biometricDeviceId}`, {
      errorMessage: error.message,
    });
    return null;
  }
}

module.exports = { getUserByBiometricId };
