"use client";

import { useState, useRef, useEffect } from "react";
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
  User as UserIcon,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { MembershipPlan, GymUser, latestPlan } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { useFirestore } from "@/firebase";
import { doc, serverTimestamp, updateDoc, runTransaction, increment } from "firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email(),
  phone: z.string().min(10, { message: "Enter a valid phone number." }),
  gender: z.enum(["Male", "Female", "Other"]),
  dateOfBirth: z.date(),
  address: z.string().min(5, { message: "Address is too short." }),
  heightCm: z.coerce.number().positive(),
  weightKg: z.coerce.number().positive(),
  fitnessGoal: z.string().min(3, { message: "Goal is too short." }),
  medicalConditions: z.string().optional(),
  profilePicture: z.string().optional(),
  role: z.enum(["member", "trainer", "admin"]),
  //   membershipPlanId: z.string({ required_error: "Please select a plan." }),
  membershipStatus: z.enum(["active", "expired", "pending"]),
  emergencyContactName: z.string().min(2),
  emergencyContactPhone: z.string().min(10),
  emergencyContactRelation: z.string().min(2),
  biometricDeviceId: z.string(),
  //   paymentStatus: z.enum(["paid", "unpaid", "pending"]),
});

interface EditMemberFormProps {
  plans: latestPlan | undefined;
  member: GymUser & { id: string };
}

export function EditMemberForm({ plans, member }: EditMemberFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const storage = getStorage();
  const queryClient = useQueryClient();

  const placeholderImageUrl = "https://picsum.photos/seed/defaultuser/400/225";
  const initialProfilePicture = member.profileImageUrl || placeholderImageUrl;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: member.name,
      email: member.email,
      phone: member.phone,
      gender: member.gender,
      dateOfBirth: new Date(member.dateOfBirth),
      address: member.address,
      heightCm: member.heightCm,
      weightKg: member.weightKg,
      fitnessGoal: member.fitnessGoal,
      medicalConditions: member.medicalConditions.join("\\n"),
      profilePicture: initialProfilePicture,
      role: member.role,
      //   membershipPlanId: member.membershipPlanId,
      membershipStatus: member.membershipStatus,
      emergencyContactName: member.emergencyContact.name,
      emergencyContactPhone: member.emergencyContact.phone,
      emergencyContactRelation: member.emergencyContact.relation,
      biometricDeviceId: member.biometricDeviceId,
      //   paymentStatus: member.paymentStatus,
    },
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

  const revertPhoto = () => {
    form.setValue("profilePicture", initialProfilePicture, {
      shouldValidate: true,
    });
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const { mutate: updateMember, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!firestore) throw new Error("Firestore not available");

      let profileImageUrl = member.profileImageUrl;
      if (values.profilePicture && values.profilePicture.startsWith("data:image")) {
        if (member.profileImageUrl && !member.profileImageUrl.includes("picsum.photos")) {
          try {
            const oldImageRef = ref(storage, member.profileImageUrl);
            await deleteObject(oldImageRef);
          } catch (error: any) {
            if (error.code !== "storage/object-not-found") {
              console.warn("Could not delete old profile image:", error);
            }
          }
        }
        const newImageRef = ref(storage, `profile_images/${member.id}_${new Date().getTime()}.png`);
        await uploadString(newImageRef, values.profilePicture, "data_url");
        profileImageUrl = await getDownloadURL(newImageRef);
      }

      const updatedUserData = {
        ...values,
        dateOfBirth: values.dateOfBirth.toISOString(),
        medicalConditions: values.medicalConditions ? values.medicalConditions.split("\n") : [],
        bmi: values.weightKg / (values.heightCm / 100) ** 2,
        emergencyContact: {
          name: values.emergencyContactName,
          phone: values.emergencyContactPhone,
          relation: values.emergencyContactRelation,
        },
        profileImageUrl,
        updatedAt: serverTimestamp(),
      };

      delete (updatedUserData as any).emergencyContactName;
      delete (updatedUserData as any).emergencyContactPhone;
      delete (updatedUserData as any).emergencyContactRelation;
      delete (updatedUserData as any).profilePicture;

      const memberDocRef = doc(firestore, "users", member.id);

      // Check if membership status has changed
      if (member.membershipStatus !== values.membershipStatus) {
        const userSummaryRef = doc(firestore, "stats/userSummary");
        await runTransaction(firestore, async (transaction) => {
          const summaryDoc = await transaction.get(userSummaryRef);
          if (!summaryDoc.exists()) return; // Exit if summary doc doesn't exist

          const summaryData = summaryDoc.data();
          let incrementValue = 0;

          // Case 1: Member is being activated
          if (member.membershipStatus !== 'active' && values.membershipStatus === 'active') {
            incrementValue = 1;
          }
          // Case 2: Member is being deactivated
          else if (member.membershipStatus === 'active' && values.membershipStatus !== 'active') {
            // Only decrement if the count is positive
            if (summaryData.activeMembers > 0) {
              incrementValue = -1;
            }
          }

          // Only update if there's a change to be made
          if (incrementValue !== 0) {
            transaction.update(userSummaryRef, {
              activeMembers: increment(incrementValue),
              lastUpdated: serverTimestamp(),
            });
          }
        });
      }

      return updateDoc(memberDocRef, updatedUserData);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Member Updated Successfully",
        description: `${variables.name}'s profile has been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['processedMembers'] });
      queryClient.invalidateQueries({ queryKey: ['userSummary'] });
      router.push("/dashboard/members");
    },
    onError: (error) => {
      console.error("Error updating member:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "An error occurred while updating the member.",
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateMember(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
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
                        <Input
                          placeholder="name@example.com"
                          {...field}
                          disabled
                        />
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
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Male" />
                            </FormControl>
                            <FormLabel className="font-normal">Male</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Female" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Female
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Other" />
                            </FormControl>
                            <FormLabel className="font-normal">Other</FormLabel>
                          </FormItem>
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
                          placeholder="Please list any relevant medical history..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank if not applicable. Separate with new lines.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Update the member's photo.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="w-full max-w-sm aspect-video rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                  {stream ? (
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                    />
                  ) : capturedImage ? (
                    <Image
                      src={capturedImage}
                      alt="Captured photo"
                      width={400}
                      height={225}
                      className="object-cover"
                      data-ai-hint="person gym"
                    />
                  ) : (
                    <UserIcon className="w-24 h-24 text-muted-foreground" />
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden"></canvas>

                {hasCameraPermission === false && (
                  <Alert variant="destructive">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                      Please allow camera access to use this feature.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  {!stream && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCameraPermission}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {member.profileImageUrl ? "Change Photo" : "Open Camera"}
                    </Button>
                  )}
                  {stream && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          stream.getTracks().forEach((track) => track.stop());
                          setStream(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={capturePhoto}>
                        Capture Photo
                      </Button>
                    </>
                  )}
                  {capturedImage &&
                    capturedImage !== initialProfilePicture &&
                    !stream && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={revertPhoto}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Revert
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
            <Card>
              <CardHeader>
                <CardTitle>Membership & Role</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="membershipStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membership Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}
                <FormField
                  control={form.control}
                  name="biometricDeviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biometric Device ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Biometric Device ID" {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input placeholder="Spouse, Sibling, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
