/**
 * Seeds the local Firebase Emulator Suite with test data for the gym app.
 *
 * Usage:
 *   1. npm run emulators        (in one terminal)
 *   2. npm run emulators:seed   (in another)
 *   3. npm run dev:emulator
 *
 * Test logins (email / password):
 *   admin@local.test   / admin123
 *   trainer@local.test / trainer123
 */

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";

const admin = require("firebase-admin");

const PROJECT_ID = "studio-7778498060-d5b43";
admin.initializeApp({ projectId: PROJECT_ID });

const db = admin.firestore();
const auth = admin.auth();
const { Timestamp } = admin.firestore;

const now = new Date();
const daysFromNow = (d) => new Date(Date.now() + d * 86400000);
const iso = (date) => date.toISOString();

function baseUserFields() {
  return {
    gender: "Other",
    dateOfBirth: "",
    age: 0,
    address: "",
    emergencyContact: { name: "", phone: "", relation: "" },
    heightCm: 0,
    weightKg: 0,
    bmi: 0,
    fitnessGoal: "",
    medicalConditions: [],
    injuries: [],
    profileImageUrl: "",
    createdAt: iso(now),
    updatedAt: iso(now),
  };
}

async function createStaff({ uid, name, email, password, username, role, phone }) {
  await auth.createUser({ uid, email, password, displayName: name });
  await db.doc(`users/${uid}`).set({
    ...baseUserFields(),
    name,
    email,
    phone,
    role,
    username,
    membershipStatus: "active",
    membershipPlanId: "",
    membershipPlan: "",
    membershipStart: "",
    membershipEnd: "",
    renewalDate: "",
    joinDate: iso(now),
    paymentStatus: "paid",
    biometricDeviceId: "",
    membershipHistory: [],
  });
  console.log(`  staff:  ${name} (${role}) — ${email} / ${password}`);
}

async function createMember({ uid, name, phone, email, bioId, plan, startOffsetDays, paidAmount }) {
  const start = daysFromNow(startOffsetDays);
  const end = new Date(start.getTime() + plan.durationInDays * 86400000);

  await db.doc(`users/${uid}`).set({
    ...baseUserFields(),
    name,
    firstName: name.split(" ")[0],
    lastName: name.split(" ").slice(1).join(" "),
    email,
    phone,
    countryCode: "+91",
    role: "member",
    biometricDeviceId: bioId,
    joinDate: iso(start),
    membershipStatus: end > now && start <= now ? "active" : end < now ? "expired" : "pending",
    membershipPlanId: plan.id,
    membershipPlan: plan.name,
    membershipStart: iso(start),
    membershipEnd: iso(end),
    paymentStatus: paidAmount >= plan.price ? "paid" : "partial",
  });

  await db.doc(`users/${uid}/membershipHistory/${Date.now()}-${bioId}`).set({
    membershipStart: iso(start),
    membershipEnd: iso(end),
    membershipPlanId: plan.id,
    membershipPlan: plan.name,
    price: plan.price,
    registrationFee: plan.registrationFee,
    totalAmount: plan.price + plan.registrationFee,
    paidAmount,
    createdAt: Timestamp.fromDate(start),
    updatedAt: Timestamp.fromDate(start),
  });

  console.log(`  member: ${name} (bio #${bioId}, ${plan.name})`);
}

async function main() {
  console.log(`Seeding emulators for project ${PROJECT_ID}...\n`);

  // --- Staff (Firebase Auth + Firestore profile) ---
  await createStaff({
    uid: "seed-admin",
    name: "Local Admin",
    email: "admin@local.test",
    password: "admin123",
    username: "admin",
    role: "admin",
    phone: "+919000000001",
  });
  await createStaff({
    uid: "seed-trainer",
    name: "Local Trainer",
    email: "trainer@local.test",
    password: "trainer123",
    username: "trainer",
    role: "trainer",
    phone: "+919000000002",
  });

  // --- Membership plans ---
  const plans = [
    {
      id: "plan-monthly",
      name: "Monthly Cardio",
      type: "Cardio",
      price: 1500,
      registrationFee: 500,
      durationInDays: 30,
      status: "active",
      features: [{ value: "Cardio floor access" }],
    },
    {
      id: "plan-quarterly",
      name: "Quarterly Bodybuilding",
      type: "Bodybuilding",
      price: 4000,
      registrationFee: 500,
      durationInDays: 90,
      status: "active",
      features: [{ value: "Full gym access" }, { value: "1 trainer session/week" }],
    },
  ];
  for (const plan of plans) {
    const { id, ...data } = plan;
    await db.doc(`membershipPlans/${id}`).set(data);
    console.log(`  plan:   ${plan.name} (₹${plan.price}/${plan.durationInDays}d)`);
  }

  // --- Members in different states: active, expiring, expired, unpaid ---
  await createMember({
    uid: "seed-member-1",
    name: "Arjun Kumar",
    phone: "+919111111111",
    email: "arjun@local.test",
    bioId: "0001",
    plan: plans[1],
    startOffsetDays: -30, // active, 60 days left
    paidAmount: 4500,
  });
  await createMember({
    uid: "seed-member-2",
    name: "Priya Nair",
    phone: "+919222222222",
    email: "priya@local.test",
    bioId: "0002",
    plan: plans[0],
    startOffsetDays: -27, // expires in 3 days
    paidAmount: 2000,
  });
  await createMember({
    uid: "seed-member-3",
    name: "Ravi Menon",
    phone: "+919333333333",
    email: "ravi@local.test",
    bioId: "0003",
    plan: plans[0],
    startOffsetDays: -60, // expired a month ago
    paidAmount: 2000,
  });
  await createMember({
    uid: "seed-member-4",
    name: "Divya Suresh",
    phone: "+919444444444",
    email: "divya@local.test",
    bioId: "0004",
    plan: plans[1],
    startOffsetDays: -5, // active but only partially paid
    paidAmount: 1000,
  });

  // --- Counters & stats the app reads/updates ---
  await db.doc("system/biometricCounter").set({ lastId: 4 });
  await db.doc("stats/userSummary").set({
    totalMembers: 4,
    activeMembers: 3,
    newMembersThisMonth: 1,
    newMembersMonth: now.toISOString().slice(0, 7),
    lastUpdated: Timestamp.now(),
  });
  await db.doc("stats/revenueSummary").set({
    totalRevenueAllTime: 9500,
    monthlyRevenue: { [now.toISOString().slice(0, 7)]: 5500 },
    lastUpdated: Timestamp.now(),
  });

  console.log("\nDone. Log in at http://localhost:3000 with:");
  console.log("  admin@local.test   / admin123");
  console.log("  trainer@local.test / trainer123");
  console.log("Emulator UI: http://127.0.0.1:4000");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err.message || err);
    process.exit(1);
  });
