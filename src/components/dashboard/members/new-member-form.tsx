"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  CalendarIcon,
  Loader2,
  ArrowLeft,
  ArrowRight,
  User as UserIcon,
  RotateCcw,
  Upload,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, add } from "date-fns";
import { useNotificationToast } from "@/hooks/use-notification-toast";
import { logMemberAdded } from "@/lib/activity-logger";
import { useRouter } from "next/navigation";
import type { MembershipPlan } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { useFirestore, useAuth, useRealtimeDb } from "@/firebase";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import {
  collection,
  serverTimestamp,
  doc,
  runTransaction,
  increment,
  setDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ref as rtdbRef, push, set } from "firebase/database";

// Required field label component
const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <>
    {children} <span className="text-destructive">*</span>
  </>
);

const formSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }).min(1, { message: "Email is required." }),
  countryCode: z.string().default("+91"),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).max(15, { message: "Phone number is too long." }),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  dateOfBirth: z.date({ required_error: "Date of birth is required." }),
  address: z.string().min(10, { message: "Please provide a complete address." }),
  emergencyContactName: z.string().min(2, "Emergency contact name is required."),
  emergencyContactPhone: z.string().min(10, "Emergency contact phone is required."),
  emergencyContactRelation: z.string().min(2, "Please specify the relationship."),
  heightCm: z.coerce.number().positive().optional(),
  heightUnit: z.enum(["cm", "inches"]).default("cm"),
  weightKg: z.coerce.number().positive().optional(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),
  fitnessGoal: z.string().optional(),
  medicalConditions: z.string().optional(),
  medicalConsent: z.boolean().default(false),
  profilePicture: z.string().optional(),
  profilePictureFile: z.instanceof(File).optional(),
  role: z.enum(["member", "trainer", "admin"]).default("member"),
  membershipPlanId: z.string({ required_error: "Please select a membership plan." }),
  joinDate: z.date({ required_error: "Join date is required." }),
  paidAmount: z.coerce.number().nonnegative("Enter a valid amount."),
  paymentMethod: z.enum(["Cash", "UPI", "Card", "Bank Transfer"]),
  sendReceipt: z.boolean().default(true),
  partialPaymentReason: z.string().optional(),
});

const STEPS = [
  {
    id: "personal",
    title: "Personal Details",
    description: "Basic information and emergency contact",
    fields: ["firstName", "lastName", "email", "countryCode", "phone", "gender", "dateOfBirth", "address", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation"],
  },
  {
    id: "membership",
    title: "Membership & Payment",
    description: "Choose a plan and process payment",
    fields: ["membershipPlanId", "joinDate", "paidAmount", "paymentMethod", "sendReceipt", "partialPaymentReason"],
  },
  {
    id: "health",
    title: "Health Profile",
    description: "Optional health information for personalized training",
    fields: ["heightCm", "heightUnit", "weightKg", "weightUnit", "fitnessGoal", "medicalConditions", "medicalConsent"],
  },
  {
    id: "picture",
    title: "Profile Photo",
    description: "Add photo for easier check-in and identification",
    fields: ["profilePicture", "profilePictureFile"]
  },
  {
    id: "review",
    title: "Review & Confirm",
    description: "Verify all information before creating member",
    fields: []
  },
];

interface NewMemberFormProps {
  plans: MembershipPlan[];
}

export function NewMemberForm({ plans }: NewMemberFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useNotificationToast();
  const router = useRouter();
  const firestore = useFirestore();
  const realtimeDb = useRealtimeDb();
  const { user: adminUser } = useAuth();
  const storage = getStorage();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      countryCode: "+91",
      phone: "",
      gender: "Male",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      joinDate: new Date(),
      role: "member",
      paidAmount: 0,
      paymentMethod: "Cash" as const,
      sendReceipt: true,
      partialPaymentReason: "",
      fitnessGoal: "",
      medicalConditions: "",
      medicalConsent: false,
      membershipPlanId: "",
      heightCm: undefined,
      heightUnit: "cm" as const,
      weightKg: undefined,
      weightUnit: "kg" as const,
      profilePicture: "",
    },
    mode: "onChange", // Real-time validation
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [duplicateCheck, setDuplicateCheck] = useState<{ phone?: string; email?: string } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  const capturedImage = useWatch({
    control: form.control,
    name: "profilePicture",
  });

  const getCameraPermission = async () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setHasCameraPermission(null);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setStream(mediaStream);
      setHasCameraPermission(true);
    } catch {
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description:
          "Please enable camera permissions in your browser settings.",
      });
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL("image/png");
    form.setValue("profilePicture", dataUri, { shouldValidate: true });

    stream.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  const recapturePhoto = () => {
    form.setValue("profilePicture", "", { shouldValidate: true });
    getCameraPermission();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.).",
      });
      return;
    }

    // Convert to data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      form.setValue("profilePicture", reader.result as string, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };

  // Duplicate detection
  const checkForDuplicates = async (phone: string, email: string) => {
    if (!firestore || (!phone && !email)) return;

    setIsCheckingDuplicate(true);
    try {
      const usersRef = collection(firestore, "users");
      const duplicates: { phone?: string; email?: string } = {};

      if (phone) {
        const phoneQuery = query(usersRef, where("phone", "==", `${form.watch("countryCode")}${phone}`));
        const phoneSnapshot = await getDocs(phoneQuery);
        if (!phoneSnapshot.empty) {
          duplicates.phone = phoneSnapshot.docs[0].data().name;
        }
      }

      if (email) {
        const emailQuery = query(usersRef, where("email", "==", email));
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
          duplicates.email = emailSnapshot.docs[0].data().name;
        }
      }

      setDuplicateCheck(Object.keys(duplicates).length > 0 ? duplicates : null);
    } catch (error) {
      console.error("Error checking duplicates:", error);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  // Check duplicates when phone or email changes
  useEffect(() => {
    const phone = form.watch("phone");
    const email = form.watch("email");

    if ((phone && phone.length >= 10) || (email && email.includes("@"))) {
      const timer = setTimeout(() => {
        checkForDuplicates(phone, email);
      }, 500); // Debounce

      return () => clearTimeout(timer);
    }
  }, [form.watch("phone"), form.watch("email")]);

  const { mutate: createMember, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!firestore || !adminUser) {
        throw new Error("You must be logged in to create a member.");
      }

      const newUserRef = doc(collection(firestore, "users"));
      let profileImageUrl = "";
      if (values.profilePicture) {
        const storageRef = ref(
          storage,
          `profile_images/${newUserRef.id}_${new Date().getTime()}.png`
        );
        await uploadString(storageRef, values.profilePicture, "data_url");
        profileImageUrl = await getDownloadURL(storageRef);
      }

      const selectedPlan = plans.find((p) => p.id === values.membershipPlanId);
      if (!selectedPlan) throw new Error("Selected plan not found");

      const membershipStart = values.joinDate;
      const membershipEnd = add(membershipStart, {
        days: selectedPlan.durationInDays,
      });

      // Use a transaction to:
      // 1. Generate sequential biometric ID
      // 2. Create user document
      // 3. Update stats
      let biometricDeviceId = "";

      await runTransaction(firestore, async (transaction) => {
        // READ PHASE - All reads must come before writes
        const counterRef = doc(firestore, "system", "biometricCounter");
        const userSummaryRef = doc(firestore, "stats/userSummary");
        const revenueSummaryRef = doc(firestore, "stats/revenueSummary");

        const [counterDoc, userSummaryDoc, revenueSummaryDoc] = await Promise.all([
          transaction.get(counterRef),
          transaction.get(userSummaryRef),
          transaction.get(revenueSummaryRef),
        ]);

        // Generate next biometric ID
        let nextId = 1;
        if (counterDoc.exists()) {
          nextId = (counterDoc.data().lastId || 0) + 1;
        }
        biometricDeviceId = nextId.toString().padStart(4, '0');

        // WRITE PHASE - Perform all writes
        // 1. Update biometric counter
        transaction.set(counterRef, { lastId: nextId }, { merge: true });

        // 2. Create user document
        const fullName = `${values.firstName} ${values.lastName}`;
        const phoneWithCountryCode = `${values.countryCode}${values.phone}`;
        const newUserData = {
          id: newUserRef.id,
          name: fullName,
          firstName: values.firstName,
          lastName: values.lastName,
          biometricDeviceId,
          email: values.email,
          phone: phoneWithCountryCode,
          countryCode: values.countryCode,
          gender: values.gender,
          dateOfBirth: values.dateOfBirth.toISOString(),
          age: new Date().getFullYear() - values.dateOfBirth.getFullYear(),
          joinDate: values.joinDate.toISOString(),
          address: values.address,
          emergencyContact: {
            name: values.emergencyContactName,
            phone: values.emergencyContactPhone,
            relation: values.emergencyContactRelation,
          },
          role: values.role,
          membershipStatus: "active",
          membershipEnd: membershipEnd.toISOString(),
          membershipPlanId: values.membershipPlanId,
          membershipPlan: selectedPlan?.name || "",
          heightCm: values.heightCm || null,
          weightKg: values.weightKg || null,
          bmi: (values.heightCm && values.weightKg) ? values.weightKg / (values.heightCm / 100) ** 2 : null,
          fitnessGoal: values.fitnessGoal,
          medicalConditions: values.medicalConditions
            ? values.medicalConditions.split("\\n")
            : [],
          injuries: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          profileImageUrl,
        };
        transaction.set(newUserRef, newUserData);

        // 3. Create membership history (using subcollection path)
        const membershipHistoryRef = doc(firestore, `users/${newUserRef.id}/membershipHistory/${Date.now()}`);
        transaction.set(membershipHistoryRef, {
          membershipStart: membershipStart.toISOString(),
          membershipEnd: membershipEnd.toISOString(),
          membershipPlanId: values.membershipPlanId,
          price: selectedPlan.price,
          paidAmount: values.paidAmount,
          membershipPlan: selectedPlan.name,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 4. Update user summary stats
        const currentMonth = format(new Date(), 'yyyy-MM');

        if (!userSummaryDoc.exists()) {
          transaction.set(userSummaryRef, {
            totalMembers: 1,
            activeMembers: 1,
            newMembersThisMonth: 1,
            newMembersMonth: currentMonth,
            lastUpdated: serverTimestamp(),
          });
        } else {
          const summaryData = userSummaryDoc.data();
          const newMembersUpdate = summaryData.newMembersMonth === currentMonth ? increment(1) : 1;

          transaction.update(userSummaryRef, {
            totalMembers: increment(1),
            activeMembers: increment(1),
            newMembersThisMonth: newMembersUpdate,
            newMembersMonth: currentMonth,
            lastUpdated: serverTimestamp(),
          });
        }

        // 5. Update revenue summary
        const paidAmount = values.paidAmount;
        if (paidAmount > 0) {
          const monthKey = format(values.joinDate, 'yyyy-MM');
          if (!revenueSummaryDoc.exists()) {
            transaction.set(revenueSummaryRef, {
              totalRevenueAllTime: paidAmount,
              monthlyRevenue: { [monthKey]: paidAmount },
              lastUpdated: serverTimestamp(),
            });
          } else {
            transaction.update(revenueSummaryRef, {
              totalRevenueAllTime: increment(paidAmount),
              [`monthlyRevenue.${monthKey}`]: increment(paidAmount),
              lastUpdated: serverTimestamp(),
            });
          }
        }
      });

      // Return user data for onSuccess handler
      return { userId: newUserRef.id, membershipStart, membershipEnd, biometricDeviceId };
    },
    onSuccess: async (data, variables) => {
      const fullName = `${variables.firstName} ${variables.lastName}`;
      toast({
        title: "Member Profile Created!",
        description: `${fullName}'s profile has been created successfully.`,
      });

      // Sync to Firebase Realtime Database for local server
      if (data && realtimeDb) {
        try {
          const registrationsRef = rtdbRef(realtimeDb, 'member_registrations');
          const newRegistrationRef = push(registrationsRef);

          await set(newRegistrationRef, {
            userId: data.userId,
            name: fullName,
            firstName: variables.firstName,
            lastName: variables.lastName,
            email: variables.email,
            phone: `${variables.countryCode}${variables.phone}`,
            biometricDeviceId: data.biometricDeviceId,
            membershipPlanId: variables.membershipPlanId,
            membershipStart: data.membershipStart.toISOString(),
            membershipEnd: data.membershipEnd.toISOString(),
            joinDate: variables.joinDate.toISOString(),
            timestamp: new Date().toISOString(),
            event: 'member_registered',
          });

          console.log('[Realtime DB] Member registration synced successfully');
        } catch (error) {
          console.error('[Realtime DB] Failed to sync:', error);
          // Don't block user flow if sync fails
        }
      }

      // Log activity
      if (firestore && adminUser) {
        await logMemberAdded(firestore, {
          userId: data.userId,
          userName: fullName,
          userEmail: variables.email,
          performedBy: adminUser.id,
          performedByName: adminUser.name || adminUser.email || "Admin",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["processedMembers"] });
      queryClient.invalidateQueries({ queryKey: ["userSummary"] });
      queryClient.invalidateQueries({ queryKey: ["revenueSummary"] });
      queryClient.invalidateQueries({ queryKey: ["recentUsersDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      router.push("/dashboard/members");
    },
    onError: (error) => {
      console.error("Error creating member:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      toast({
        variant: "destructive",
        title: "Uh oh!",
        description: error.message || "Could not create member profile. Check console for details.",
      });
    },
  });

  function processForm(values: z.infer<typeof formSchema>) {
    // The zodResolver now handles all validation on submit.
    createMember(values);
  }

  function onFormError(errors: any) {
    // Find the first field with an error
    const firstErrorField = Object.keys(errors)[0] as keyof z.infer<typeof formSchema>;
    
    // Find the step corresponding to that field
    const stepIndex = STEPS.findIndex(step => step.fields.includes(firstErrorField));

    // Navigate to that step if it's not the current one
    if (stepIndex !== -1 && stepIndex !== currentStep) {
      setCurrentStep(stepIndex);
    }
  }

  const nextStep = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const fields = STEPS[currentStep].fields as (keyof z.infer<
      typeof formSchema
    >)[];
    const isValid = await form.trigger(fields);

    if (!isValid) {
      return; // Stay on the current step if validation fails
    }

    if (currentStep < STEPS.length - 1) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setCurrentStep((step) => step + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setCurrentStep((step) => step - 1);
    }
  };
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const selectedPlanId = form.watch("membershipPlanId");
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId),
    [selectedPlanId, plans]
  );

  const paidAmount = form.watch("paidAmount");
  useEffect(() => {
    if (selectedPlan && paidAmount > selectedPlan.price) {
      form.setError("paidAmount", {
        type: "manual",
        message: "Paid amount cannot exceed plan price.",
      });
    } else {
      form.clearErrors("paidAmount");
    }
  }, [paidAmount, selectedPlan, form]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="space-y-3 mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{STEPS[currentStep].title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {STEPS[currentStep].description}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Preview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "p-3 rounded-lg border text-center transition-all",
              index === currentStep
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : index < currentStep
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-muted/50 border-border text-muted-foreground"
            )}
          >
            <div className="text-xs font-medium mb-1">Step {index + 1}</div>
            <div className="text-sm font-semibold leading-tight">{step.title}</div>
          </div>
        ))}
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-900 mb-1">Your data is secure</p>
            <p className="text-blue-700 text-xs">
              All information is encrypted and used solely for membership management. We never share your data with third parties.
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(processForm, onFormError)} className="space-y-6 md:space-y-8">
          {/* Step 1: Personal Details + Emergency Contact */}
          <div className={cn(currentStep !== 0 && "hidden")}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Member's personal details</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><RequiredLabel>First Name</RequiredLabel></FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><RequiredLabel>Last Name</RequiredLabel></FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><RequiredLabel>Email Address</RequiredLabel></FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.doe@example.com"
                          {...field}
                          className={cn(duplicateCheck?.email && "border-destructive")}
                        />
                      </FormControl>
                      {duplicateCheck?.email && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTitle>Member Already Exists</AlertTitle>
                          <AlertDescription>
                            A member with this email already exists: <strong>{duplicateCheck.email}</strong>
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormDescription className="text-xs">
                        Required for receipts, renewals, and important notifications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="countryCode"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><RequiredLabel>Phone Number</RequiredLabel></FormLabel>
                      <div className="flex gap-2">
                        <Select
                          value={form.watch("countryCode")}
                          onValueChange={(value) => form.setValue("countryCode", value)}
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue placeholder="+91" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+91">
                              <div className="flex items-center gap-2">
                                <span>🇮🇳</span>
                                <span>+91</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="+1">
                              <div className="flex items-center gap-2">
                                <span>🇺🇸</span>
                                <span>+1</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="+44">
                              <div className="flex items-center gap-2">
                                <span>🇬🇧</span>
                                <span>+44</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="+971">
                              <div className="flex items-center gap-2">
                                <span>🇦🇪</span>
                                <span>+971</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormControl>
                          <Input
                            placeholder="9876543210"
                            {...field}
                            onChange={(e) => {
                              // Only allow numbers
                              const value = e.target.value.replace(/\D/g, '');
                              field.onChange(value);
                            }}
                            className={cn(duplicateCheck?.phone && "border-destructive")}
                          />
                        </FormControl>
                      </div>
                      {duplicateCheck?.phone && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTitle>Member Already Exists</AlertTitle>
                          <AlertDescription>
                            A member with this phone number already exists: <strong>{duplicateCheck.phone}</strong>
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormDescription className="text-xs">
                        10-digit mobile number without country code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><RequiredLabel>Date of Birth</RequiredLabel></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>e.g., 25/10/1995</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            captionLayout="dropdown-buttons"
                            fromYear={1960}
                            toYear={new Date().getFullYear()}
                            selected={field.value}
                            onSelect={field.onChange}
                            defaultMonth={field.value || new Date(2000, 0)}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription className="text-xs">
                        Click to open calendar or type date (DD/MM/YYYY format)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="space-y-3 md:col-span-2">
                      <FormLabel><RequiredLabel>Gender</RequiredLabel></FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-wrap items-center gap-4"
                        >
                          {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
                            <FormItem
                              key={g}
                              className="flex items-center space-x-2 space-y-0"
                            >
                              <FormControl>
                                <RadioGroupItem value={g} />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">{g}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormDescription className="text-xs">
                        Required for locker room assignment and facility access
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel><RequiredLabel>Complete Address</RequiredLabel></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Street Address, Area, City, State, PIN Code"
                          {...field}
                          rows={2}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Full address for emergency contact and communications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="mt-4 md:mt-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Emergency Contact</CardTitle>
                <CardDescription>Person to contact in case of emergency</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><RequiredLabel>Contact Name</RequiredLabel></FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><RequiredLabel>Contact Phone</RequiredLabel></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="9876543210"
                          {...field}
                          onChange={(e) => {
                            // Only allow numbers
                            const value = e.target.value.replace(/\D/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        10-digit mobile number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactRelation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><RequiredLabel>Relationship</RequiredLabel></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Spouse">Spouse</SelectItem>
                          <SelectItem value="Parent">Parent</SelectItem>
                          <SelectItem value="Sibling">Sibling</SelectItem>
                          <SelectItem value="Child">Child</SelectItem>
                          <SelectItem value="Friend">Friend</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Step 2: Membership & Payment */}
          <div className={cn(currentStep !== 1 && "hidden")}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Membership Plan</CardTitle>
                <CardDescription>Select a membership plan and process payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><RequiredLabel>Start Date</RequiredLabel></FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(field.value, "PPP")
                                  : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription className="text-xs">
                          When the membership becomes active (defaults to today)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="membershipPlanId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><RequiredLabel>Membership Plan</RequiredLabel></FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {plans
                              .filter((plan) => plan.status === "active")
                              .map((plan) => (
                                <SelectItem key={plan.id} value={plan.id}>
                                  {plan.name} - ₹{plan.price} ({plan.durationInDays} days)
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="paidAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><RequiredLabel>Paid Amount (₹)</RequiredLabel></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              placeholder="500"
                              className="pl-7"
                              {...field}
                              value={field.value === undefined ? "" : field.value}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><RequiredLabel>Payment Method</RequiredLabel></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="How was payment received?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="UPI">UPI / QR Code</SelectItem>
                            <SelectItem value="Card">Card (Debit/Credit)</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedPlan && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Plan Price:</span>
                      <span className="font-semibold">₹{selectedPlan.price}</span>
                    </div>
                    {paidAmount !== undefined && paidAmount !== null && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Paid:</span>
                          <span className="font-medium">₹{paidAmount}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1 pt-2 border-t">
                          <span className="text-sm font-medium">
                            {paidAmount >= selectedPlan.price ? "Status:" : "Balance:"}
                          </span>
                          <span
                            className={cn(
                              "font-bold text-lg",
                              paidAmount > selectedPlan.price
                                ? "text-destructive"
                                : paidAmount === selectedPlan.price
                                ? "text-green-600"
                                : "text-orange-600"
                            )}
                          >
                            {paidAmount >= selectedPlan.price
                              ? "Fully Paid ✓"
                              : `₹${Math.max(selectedPlan.price - paidAmount, 0)} Outstanding`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedPlan && paidAmount < selectedPlan.price && (
                  <FormField
                    control={form.control}
                    name="partialPaymentReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Partial Payment Reason</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Why is this a partial payment? (e.g., installment plan, financial difficulty)"
                            {...field}
                            rows={2}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Help track why balance is outstanding
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="sendReceipt"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">
                          Send payment receipt via email
                        </FormLabel>
                        <FormDescription>
                          Member will receive a receipt at their registered email address
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Hidden Role Field (defaults to member) */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Step 3: Health Profile */}
          <div className={cn(currentStep !== 2 && "hidden")}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Health & Fitness Information</CardTitle>
                <CardDescription>Optional: Helps trainers create better workout plans</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Height with unit selector */}
                <FormField
                  control={form.control}
                  name="heightCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={form.watch("heightUnit") === "cm" ? "175" : "5.9"}
                            {...field}
                            className="flex-1"
                          />
                        </FormControl>
                        <Select
                          value={form.watch("heightUnit")}
                          onValueChange={(value) => form.setValue("heightUnit", value as "cm" | "inches")}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cm">cm</SelectItem>
                            <SelectItem value="inches">inches</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Weight with unit selector */}
                <FormField
                  control={form.control}
                  name="weightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={form.watch("weightUnit") === "kg" ? "70" : "154"}
                            {...field}
                            className="flex-1"
                          />
                        </FormControl>
                        <Select
                          value={form.watch("weightUnit")}
                          onValueChange={(value) => form.setValue("weightUnit", value as "kg" | "lbs")}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="lbs">lbs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fitness Goal as dropdown */}
                <FormField
                  control={form.control}
                  name="fitnessGoal"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Primary Fitness Goal <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="What would you like to achieve?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                          <SelectItem value="Muscle Gain">Muscle Gain / Bodybuilding</SelectItem>
                          <SelectItem value="General Fitness">General Fitness & Health</SelectItem>
                          <SelectItem value="Endurance">Endurance & Stamina</SelectItem>
                          <SelectItem value="Flexibility">Flexibility & Mobility</SelectItem>
                          <SelectItem value="Sports Performance">Sports Performance</SelectItem>
                          <SelectItem value="Rehabilitation">Rehabilitation / Injury Recovery</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Helps trainers recommend appropriate workout programs
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Medical Conditions */}
                <FormField
                  control={form.control}
                  name="medicalConditions"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Medical Conditions or Injuries <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List any conditions that may affect exercise (e.g., asthma, knee injury, diabetes, heart condition)..."
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        This information is kept strictly confidential and helps trainers design safer workout plans. We are not medical professionals - please consult your doctor before starting any exercise program.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Medical Consent Checkbox */}
                <FormField
                  control={form.control}
                  name="medicalConsent"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 flex flex-row items-start space-x-3 space-y-0 rounded-md border border-amber-200 bg-amber-50/50 p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer font-medium">
                          Medical Information Acknowledgment
                        </FormLabel>
                        <FormDescription className="text-xs leading-relaxed">
                          I understand that the gym and its staff are not medical professionals. The health information I provide is for fitness planning purposes only. I have consulted with my physician regarding my fitness to participate in physical exercise, and I assume all risks associated with my participation.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Step 4: Profile Picture */}
          <div className={cn(currentStep !== 3 && "hidden")}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Profile Photo</CardTitle>
                <CardDescription>
                  Optional: Helps with member identification during check-ins
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6">
                {/* Photo Preview Area */}
                <div className="w-full max-w-sm aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center overflow-hidden">
                  {capturedImage ? (
                    <Image
                      src={capturedImage}
                      alt="Profile photo"
                      width={400}
                      height={225}
                      className="object-cover w-full h-full"
                    />
                  ) : stream ? (
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <ImageIcon className="w-16 h-16 text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No photo yet</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Use camera or upload a file</p>
                      </div>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden"></canvas>

                {/* Photo Requirements */}
                <div className="w-full max-w-sm bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-xs font-medium text-blue-900 mb-1">Photo Requirements:</p>
                  <ul className="text-xs text-blue-800 space-y-0.5 ml-4 list-disc">
                    <li>Clear, well-lit frontal face photo</li>
                    <li>Maximum size: 5MB</li>
                    <li>Formats: JPG, PNG, WebP</li>
                    <li>Used only for member identification</li>
                  </ul>
                </div>

                {/* Camera Permission Error */}
                {hasCameraPermission === false && (
                  <Alert variant="destructive" className="max-w-sm">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                      Please allow camera access in your browser settings or use the upload option instead.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                  {!capturedImage && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={getCameraPermission}
                        className="flex-1"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {stream ? "Close Camera" : "Open Camera"}
                      </Button>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photo
                      </Button>
                    </>
                  )}

                  {stream && !capturedImage && (
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Capture Photo
                    </Button>
                  )}

                  {capturedImage && (
                    <div className="flex gap-2 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={recapturePhoto}
                        className="flex-1"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Change Photo
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          form.setValue("profilePicture", "");
                          setCapturedImage(null);
                        }}
                        className="flex-1"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {/* Hidden Form Field */}
                <FormField
                  control={form.control}
                  name="profilePicture"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Step 5: Review & Confirm */}
          <div className={cn(currentStep !== 4 && "hidden")}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Review & Confirm</CardTitle>
                <CardDescription>
                  Please verify all information before creating the member profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Personal Details Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Personal Details</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(0)}
                      className="h-8 text-xs"
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/30 rounded-md p-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Full Name</span>
                      <p className="font-medium">{form.watch("firstName")} {form.watch("lastName")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Email</span>
                      <p className="font-medium break-all">{form.watch("email")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Phone</span>
                      <p className="font-medium">{form.watch("countryCode")} {form.watch("phone")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Gender</span>
                      <p className="font-medium">{form.watch("gender")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Date of Birth</span>
                      <p className="font-medium">
                        {form.watch("dateOfBirth") ? format(form.watch("dateOfBirth"), "dd/MM/yyyy") : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Address</span>
                      <p className="font-medium line-clamp-2">{form.watch("address")}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground text-xs">Emergency Contact</span>
                      <p className="font-medium">
                        {form.watch("emergencyContactName")} ({form.watch("emergencyContactRelation")}) - {form.watch("emergencyContactPhone")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Membership & Payment Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Membership & Payment</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(1)}
                      className="h-8 text-xs"
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/30 rounded-md p-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Membership Plan</span>
                      <p className="font-medium">
                        {plans?.find(p => p.id === form.watch("membershipPlanId"))?.name || "Not selected"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Start Date</span>
                      <p className="font-medium">
                        {form.watch("joinDate") ? format(form.watch("joinDate"), "dd/MM/yyyy") : "Not set"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Plan Price</span>
                      <p className="font-medium">
                        ₹{plans?.find(p => p.id === form.watch("membershipPlanId"))?.price || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Paid Amount</span>
                      <p className="font-medium">₹{form.watch("paidAmount") || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Payment Method</span>
                      <p className="font-medium">{form.watch("paymentMethod") || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Balance Status</span>
                      <p className={cn(
                        "font-medium",
                        (form.watch("paidAmount") || 0) >= (plans?.find(p => p.id === form.watch("membershipPlanId"))?.price || 0)
                          ? "text-green-600"
                          : "text-orange-600"
                      )}>
                        {(form.watch("paidAmount") || 0) >= (plans?.find(p => p.id === form.watch("membershipPlanId"))?.price || 0)
                          ? "Fully Paid ✓"
                          : `₹${(plans?.find(p => p.id === form.watch("membershipPlanId"))?.price || 0) - (form.watch("paidAmount") || 0)} Outstanding`
                        }
                      </p>
                    </div>
                    {form.watch("partialPaymentReason") && (
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground text-xs">Partial Payment Reason</span>
                        <p className="font-medium text-orange-700">{form.watch("partialPaymentReason")}</p>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground text-xs">Receipt</span>
                      <p className="font-medium">
                        {form.watch("sendReceipt") ? "Will be sent to email" : "Will not be sent"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Health Profile Section (if filled) */}
                {(form.watch("heightCm") || form.watch("weightKg") || form.watch("fitnessGoal") || form.watch("medicalConditions")) && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Health Profile</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(2)}
                        className="h-8 text-xs"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/30 rounded-md p-4 text-sm">
                      {form.watch("heightCm") && (
                        <div>
                          <span className="text-muted-foreground text-xs">Height</span>
                          <p className="font-medium">{form.watch("heightCm")} {form.watch("heightUnit")}</p>
                        </div>
                      )}
                      {form.watch("weightKg") && (
                        <div>
                          <span className="text-muted-foreground text-xs">Weight</span>
                          <p className="font-medium">{form.watch("weightKg")} {form.watch("weightUnit")}</p>
                        </div>
                      )}
                      {form.watch("fitnessGoal") && (
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground text-xs">Fitness Goal</span>
                          <p className="font-medium">{form.watch("fitnessGoal")}</p>
                        </div>
                      )}
                      {form.watch("medicalConditions") && (
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground text-xs">Medical Conditions</span>
                          <p className="font-medium line-clamp-3">{form.watch("medicalConditions")}</p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground text-xs">Medical Consent</span>
                        <p className="font-medium">
                          {form.watch("medicalConsent") ? "Acknowledged ✓" : "Not acknowledged"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profile Photo Section (if provided) */}
                {form.watch("profilePicture") && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Profile Photo</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(3)}
                        className="h-8 text-xs"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="bg-muted/30 rounded-md p-4">
                      <Image
                        src={form.watch("profilePicture")}
                        alt="Member photo"
                        width={200}
                        height={150}
                        className="rounded-md object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Final Confirmation */}
                <div className="border-t pt-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm font-medium text-green-900">Ready to create member profile</p>
                    <p className="text-xs text-green-700 mt-1">
                      Click "Create Member" below to save this member to the system. You can edit their details anytime from the members page.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-3 md:gap-4 mt-6 md:mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0 || isPending}
              className="flex-shrink-0"
            >
              <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>

            <div className="flex gap-2 md:gap-3">
              {/* Show Skip button on optional steps (Health & Picture) */}
              {(currentStep === 2 || currentStep === 3) && currentStep < STEPS.length - 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => nextStep(e)}
                  disabled={isPending}
                  className="hidden sm:flex"
                >
                  Skip
                </Button>
              )}

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={(e) => nextStep(e)} disabled={isPending}>
                  Next <ArrowRight className="ml-1 md:ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <span className="hidden sm:inline">{isPending ? "Creating..." : "Create Member"}</span>
                  <span className="sm:hidden">{isPending ? "Creating..." : "Create"}</span>
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
