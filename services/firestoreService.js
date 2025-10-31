const { db } = require("../config/firebaseConfig");
const log = require("../utils/logger");

const ATTENDANCE_COLLECTION = "attendance_logs";

/**
 * Saves an attendance record using the userId as the document ID to prevent duplicates.
 * This approach uses a single `create` operation, which fails if the document already exists,
 * thus avoiding a separate read operation to check for duplicates.
 * @param {object} record The attendance record to save.
 */
async function saveAttendanceRecord(record) {
  if (!db) {
    log("error", "Firestore is not initialized. Cannot save attendance record.");
    return;
  }

  try {
    const { userId, date } = record;
    const docPath = `${ATTENDANCE_COLLECTION}/${date}/records/${userId}`;
    const docRef = db.doc(docPath);

    await docRef.create(record);

    log("success", `📝 Record saved to Firestore path: ${docPath}`, record);
  } catch (error) {
    // If the error code is 6 (ALREADY_EXISTS), it's a duplicate check-in.
    if (error.code === 6) {
      log(
        "warning",
        `Duplicate check-in blocked for user ${record.userId} on ${record.date}.`
      );
    } else {
      // For any other errors, log them as a failure.
      log("error", "Failed to save attendance record:", {
        errorMessage: error.message,
        record,
      });
    }
  }
}

module.exports = { saveAttendanceRecord };
