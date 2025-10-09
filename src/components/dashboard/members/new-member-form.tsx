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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, add } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { MembershipPlan, UserRole } from "@/lib/types";
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
import { useFirestore, useAuth } from "@/firebase";
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
  writeBatch,
  runTransaction,
  FieldValue,
  increment,
  setDoc,
} from "firebase/firestore";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email(),
  phone: z.string().min(10, { message: "Enter a valid phone number." }),
  gender: z.enum(["Male", "Female", "Other"]),
  dateOfBirth: z.date({ required_error: "Date of birth is required." }),
  address: z.string().min(5, { message: "Address is too short." }),
  heightCm: z.coerce.number().positive(),
  weightKg: z.coerce.number().positive(),
  fitnessGoal: z.string().min(3, { message: "Goal is too short." }),
  medicalConditions: z.string().optional(),
  profilePicture: z.string().optional(),
  role: z.enum(["member", "trainer", "admin"]),
  membershipPlanId: z.string({ required_error: "Please select a plan." }),
  joinDate: z.date({ required_error: "Join date is required." }),
  emergencyContactName: z.string().min(2),
  emergencyContactPhone: z.string().min(10),
  emergencyContactRelation: z.string({
    required_error: "Please select a relationship.",
  }),
  biometricDeviceId: z
    .string()
    .min(3, { message: "Biometric Device ID is required." }),
});

const STEPS = [
  {
    id: "personal",
    title: "Personal Information",
    fields: ["name", "email", "phone", "gender", "dateOfBirth", "address"],
  },
  {
    id: "health",
    title: "Health & Fitness",
    fields: ["heightCm", "weightKg", "fitnessGoal", "medicalConditions"],
  },
  { id: "picture", title: "Profile Picture", fields: ["profilePicture"] },
  {
    id: "membership",
    title: "Membership & Role",
    fields: ["membershipPlanId", "joinDate", "role", "biometricDeviceId"],
  },
  {
    id: "emergency",
    title: "Emergency Contact",
    fields: [
      "emergencyContactName",
      "emergencyContactPhone",
      "emergencyContactRelation",
    ],
  },
];

interface NewMemberFormProps {
  plans: MembershipPlan[];
}

export function NewMemberForm({ plans }: NewMemberFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user: adminUser } = useAuth();
  const storage = getStorage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: "Male",
      joinDate: new Date(),
      role: "member",
    },
    mode: "onChange",
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

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

  async function processForm(values: z.infer<typeof formSchema>) {
    if (!firestore || !adminUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to create a member.",
      });
      return;
    }

    setIsLoading(true);

    try {
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

      const newUserData = {
        id: newUserRef.id,
        name: values.name,
        biometricDeviceId: values.biometricDeviceId,
        email: values.email,
        phone: values.phone,
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
        membershipPlanId: values.membershipPlanId,
        membershipStatus: "active",
        membershipStart: membershipStart.toISOString(),
        membershipEnd: membershipEnd.toISOString(),
        renewalDate: membershipEnd.toISOString(),
        heightCm: values.heightCm,
        weightKg: values.weightKg,
        bmi: values.weightKg / (values.heightCm / 100) ** 2,
        fitnessGoal: values.fitnessGoal,
        medicalConditions: values.medicalConditions
          ? values.medicalConditions.split("\\n")
          : [],
        injuries: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        profileImageUrl,
      };

      // Step 1: Create the new user document
      await setDoc(newUserRef, newUserData);

      // Step 2: Atomically update the user summary stats using a transaction
      const userSummaryRef = doc(firestore, "stats/userSummary");
      await runTransaction(firestore, async (transaction) => {
        const summaryDoc = await transaction.get(userSummaryRef);
        if (!summaryDoc.exists()) {
          // If the document doesn't exist, create it.
          transaction.set(userSummaryRef, {
            totalMembers: 1,
            activeMembers: 1,
            newMembersThisMonth: 1,
            lastUpdated: serverTimestamp(),
          });
        } else {
          // If it exists, increment the fields.
          transaction.update(userSummaryRef, {
            totalMembers: increment(1),
            activeMembers: increment(1),
            newMembersThisMonth: increment(1),
            lastUpdated: serverTimestamp(),
          });
        }
      });

      toast({
        title: "Member Profile Created!",
        description: `${values.name}'s profile has been created. Now, create their login credentials in Firebase Authentication.`,
      });
      router.push("/dashboard/members");
    } catch (error) {
      console.error("Error creating member:", error);
      toast({
        variant: "destructive",
        title: "Uh oh!",
        description:
          "Could not create member profile. Make sure the stats documents are initialized in Firestore.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  type FieldName = keyof z.infer<typeof formSchema>;

  const nextStep = async () => {
    const fields = STEPS[currentStep].fields;
    const valid = await form.trigger(fields as FieldName[], {
      shouldFocus: true,
    });
    if (!valid) return;
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

  return (
    <div>
      <div className="space-y-2 mb-8">
        <Progress value={progress} />
        <p className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(processForm)} className="space-y-8">
          <div className={cn(currentStep !== 0 && "hidden")}>
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 987 654 3210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
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
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-4"
                        >
                          {["Male", "Female", "Other"].map((g) => (
                            <FormItem
                              key={g}
                              className="flex items-center space-x-2 space-y-0"
                            >
                              <FormControl>
                                <RadioGroupItem value={g} />
                              </FormControl>
                              <FormLabel className="font-normal">{g}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Main St, Anytown..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className={cn(currentStep !== 1 && "hidden")}>
            <Card>
              <CardHeader>
                <CardTitle>Health & Fitness</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="heightCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="175" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="70" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fitnessGoal"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Primary Fitness Goal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Weight loss, muscle gain"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medicalConditions"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Medical Conditions or Injuries</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List any relevant medical history..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank if not applicable.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className={cn(currentStep !== 2 && "hidden")}>
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  Capture a photo of the new member.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="w-full max-w-sm aspect-video rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                  {capturedImage ? (
                    <Image
                      src={capturedImage}
                      alt="Captured photo"
                      width={400}
                      height={225}
                      className="object-cover"
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
                    <UserIcon className="w-24 h-24 text-muted-foreground" />
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden"></canvas>

                <video
                  ref={videoRef}
                  className={cn("hidden", {
                    "block w-full max-w-sm aspect-video rounded-md":
                      stream && !capturedImage,
                  })}
                  autoPlay
                  muted
                  playsInline
                />

                {hasCameraPermission === false && (
                  <Alert variant="destructive">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                      Please allow camera access to use this feature.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  {!capturedImage && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCameraPermission}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {stream ? "Close Camera" : "Open Camera"}
                    </Button>
                  )}
                  {stream && !capturedImage && (
                    <Button type="button" onClick={capturePhoto}>
                      Capture Photo
                    </Button>
                  )}
                  {capturedImage && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={recapturePhoto}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Recapture
                    </Button>
                  )}
                </div>
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

          <div className={cn(currentStep !== 3 && "hidden")}>
            <Card>
              <CardHeader>
                <CardTitle>Membership & Role</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="joinDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Join Date</FormLabel>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="membershipPlanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membership Plan</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an active plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {plans
                            .filter((plan) => plan.status === "active")
                            .map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name} (₹{plan.price})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="biometricDeviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biometric Device ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter the biometric device ID"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the unique ID assigned to the biometric device for
                        this member.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="trainer">Trainer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className={cn(currentStep !== 4 && "hidden")}>
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
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
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 876 543 2109" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactRelation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Spouse">Spouse</SelectItem>
                          <SelectItem value="Parent">Parent</SelectItem>
                          <SelectItem value="Sibling">Sibling</SelectItem>
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
        </form>
      </Form>

      <div className="mt-8 pt-5 flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button type="button" onClick={nextStep}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={form.handleSubmit(processForm)}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Member Profile
          </Button>
        )}
      </div>
    </div>
  );
}
