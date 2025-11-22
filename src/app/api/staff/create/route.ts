import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import type { UserRole } from "@/lib/types";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = require("@/serviceAccountKey.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, role, username, password } = body;

    // Validate required fields
    if (!name || !email || !phone || !role || !username || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if username already exists in Firestore
    const usersRef = admin.firestore().collection("users");
    const usernameQuery = await usersRef.where("username", "==", username).get();

    if (!usernameQuery.empty) {
      return NextResponse.json(
        { error: "Username already exists. Please choose a different username." },
        { status: 400 }
      );
    }

    // Create user with Firebase Auth using Admin SDK
    // This doesn't affect the current user's session
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    const userId = userRecord.uid;

    // Create Firestore document
    const staffData = {
      name,
      email,
      phone,
      role: role as UserRole,
      // Authentication credentials (for username login fallback)
      username,
      password, // Stored for username-based auth
      // Staff members don't have membership fields
      membershipStatus: "active" as const,
      membershipPlanId: "",
      membershipPlan: "",
      membershipStart: "",
      membershipEnd: "",
      renewalDate: "",
      // Basic fields
      gender: "Other" as const,
      dateOfBirth: "",
      age: 0,
      joinDate: new Date().toISOString(),
      address: "",
      emergencyContact: {
        name: "",
        phone: "",
        relation: "",
      },
      // Physical details
      heightCm: 0,
      weightKg: 0,
      bmi: 0,
      fitnessGoal: "",
      medicalConditions: [],
      injuries: [],
      // System fields
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profileImageUrl: "",
      biometricDeviceId: "",
      paymentStatus: "paid" as const,
      membershipHistory: [],
    };

    await admin.firestore().collection("users").doc(userId).set(staffData);

    return NextResponse.json({
      success: true,
      userId,
      message: `${role === "admin" ? "Admin" : "Trainer"} added successfully`,
    });
  } catch (error: any) {
    console.error("Error creating staff member:", error);

    let errorMessage = "Failed to add staff member. Please try again.";
    let statusCode = 500;

    if (error.code === "auth/email-already-exists") {
      errorMessage = "This email is already registered.";
      statusCode = 400;
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address.";
      statusCode = 400;
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak. Please use a stronger password (minimum 6 characters).";
      statusCode = 400;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
