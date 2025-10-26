import { addDoc, collection, serverTimestamp, Firestore } from "firebase/firestore";

export type ActivityType =
  | "payment"
  | "member_added"
  | "member_updated"
  | "member_deleted"
  | "membership_renewed"
  | "membership_frozen"
  | "plan_created"
  | "plan_updated";

interface LogActivityParams {
  firestore: Firestore;
  type: ActivityType;
  description: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  performedBy: string;
  performedByName?: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export async function logActivity({
  firestore,
  type,
  description,
  userId,
  userName,
  userEmail,
  performedBy,
  performedByName,
  amount,
  metadata,
}: LogActivityParams) {
  try {
    console.log("[Activity Logger] Logging activity:", { type, description, performedBy });
    
    const docRef = await addDoc(collection(firestore, "activityLogs"), {
      type,
      description,
      userId: userId || null,
      userName: userName || null,
      userEmail: userEmail || null,
      performedBy,
      performedByName: performedByName || null,
      amount: amount || null,
      metadata: metadata || null,
      timestamp: serverTimestamp(),
    });
    
    console.log("[Activity Logger] Successfully logged activity:", docRef.id);
  } catch (error) {
    console.error("[Activity Logger] Failed to log activity:", {
      error,
      type,
      description,
      performedBy,
      performedByName,
    });
    // Don't throw - activity logging shouldn't break the main flow
  }
}

// Helper functions for common activities

export function logPayment(
  firestore: Firestore,
  params: {
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    planName: string;
    performedBy: string;
    performedByName: string;
  }
) {
  return logActivity({
    firestore,
    type: "payment",
    description: `Payment of ₹${params.amount} received from ${params.userName} for ${params.planName}`,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
    amount: params.amount,
    metadata: { planName: params.planName },
  });
}

export function logMemberAdded(
  firestore: Firestore,
  params: {
    userId: string;
    userName: string;
    userEmail: string;
    performedBy: string;
    performedByName: string;
  }
) {
  return logActivity({
    firestore,
    type: "member_added",
    description: `New member ${params.userName} added to the system`,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
  });
}

export function logMemberUpdated(
  firestore: Firestore,
  params: {
    userId: string;
    userName: string;
    userEmail: string;
    performedBy: string;
    performedByName: string;
  }
) {
  return logActivity({
    firestore,
    type: "member_updated",
    description: `Member profile updated for ${params.userName}`,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
  });
}

export function logMemberDeleted(
  firestore: Firestore,
  params: {
    userId: string;
    userName: string;
    userEmail: string;
    performedBy: string;
    performedByName: string;
  }
) {
  return logActivity({
    firestore,
    type: "member_deleted",
    description: `Member ${params.userName} removed from the system`,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
  });
}

export function logMembershipRenewed(
  firestore: Firestore,
  params: {
    userId: string;
    userName: string;
    userEmail: string;
    planName: string;
    amount: number;
    validTill: string;
    performedBy: string;
    performedByName: string;
  }
) {
  return logActivity({
    firestore,
    type: "membership_renewed",
    description: `${params.userName}'s membership renewed with ${params.planName} plan, valid till ${params.validTill}`,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
    amount: params.amount,
    metadata: { planName: params.planName, validTill: params.validTill },
  });
}

export function logMembershipFrozen(
  firestore: Firestore,
  params: {
    userId: string;
    userName: string;
    userEmail: string;
    freezeStart: string;
    freezeEnd: string;
    performedBy: string;
    performedByName: string;
  }
) {
  return logActivity({
    firestore,
    type: "membership_frozen",
    description: `${params.userName}'s membership frozen from ${params.freezeStart} to ${params.freezeEnd}`,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
    metadata: { freezeStart: params.freezeStart, freezeEnd: params.freezeEnd },
  });
}

export function logPlanCreated(
  firestore: Firestore,
  params: {
    planId: string;
    planName: string;
    price: number;
    duration: number;
    performedBy: string;
    performedByName: string;
  }
) {
  return logActivity({
    firestore,
    type: "plan_created",
    description: `New membership plan "${params.planName}" created (₹${params.price} for ${params.duration} days)`,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
    amount: params.price,
    metadata: { planId: params.planId, planName: params.planName, duration: params.duration },
  });
}

export function logPlanUpdated(
  firestore: Firestore,
  params: {
    planId: string;
    planName: string;
    performedBy: string;
    performedByName: string;
  }
) {
  return logActivity({
    firestore,
    type: "plan_updated",
    description: `Membership plan "${params.planName}" updated`,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
    metadata: { planId: params.planId, planName: params.planName },
  });
}
