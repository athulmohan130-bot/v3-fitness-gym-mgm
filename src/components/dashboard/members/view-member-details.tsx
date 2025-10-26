import type { GymUser, MembershipPlan } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  format,
  differenceInDays,
  parseISO,
  isBefore,
  isAfter,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from 'lucide-react';
import React, { useState } from "react";
import { useFirestore } from "@/firebase";
import { useAuth } from "@/lib/auth-provider";
import { logMemberUpdated } from "@/lib/activity-logger";
import { Label } from "@/components/ui/label";
import { CreditCard, Snowflake, Trash2, Calendar as CalendarIcon, User, Heart, Shield, Landmark, Wallet, Loader2, Edit, Save, X as XIcon, Camera, Upload } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ViewMemberDetailsProps {
  member: GymUser;
  plan?: any;
  availablePlans?: any[];
  onPaymentSubmit?: (historyId: string, amount: number) => void;
  onFreezeSubmit?: (planId: string, freezeStart: Date, freezeEnd: Date) => void;
  onHandleDelete: (planId: string) => void;
  paymentOpen: boolean;
  setPaymentOpen: (open: boolean) => void;
  selectedHistoryForPayment: any;
  setSelectedHistoryForPayment: (history: any) => void;
  onUpdateMember: (updates: Partial<GymUser>) => Promise<void>;
}

const DetailItem = ({
  label,
  value,
  isEditable,
  onValueChange,
  type = "text",
  options,
}: {
  label: string;
  value: React.ReactNode;
  isEditable?: boolean;
  onValueChange?: (value: string) => void;
  type?: "text" | "email" | "tel" | "number" | "date" | "select" | "textarea";
  options?: { label: string; value: string }[];
}) => {
  if (isEditable && onValueChange) {
    if (type === "select" && options) {
      return (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
          <Select value={value as string} onValueChange={onValueChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    if (type === "textarea") {
      return (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
          <Input
            type="text"
            value={value as string}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full"
          />
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        <Input
          type={type}
          value={value as string}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full"
        />
      </div>
    );
  }
  
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value || "N/A"}</p>
    </div>
  );
};

export function ViewMemberDetails({
  member,
  plan,
  availablePlans,
  onPaymentSubmit,
  onFreezeSubmit,
  onHandleDelete,
  paymentOpen,
  setPaymentOpen,
  selectedHistoryForPayment,
  setSelectedHistoryForPayment,
  onUpdateMember,
}: ViewMemberDetailsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentType, setPaymentType] = useState("cash");

  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeStartDate, setFreezeStartDate] = useState<Date | undefined>();
  const [freezeEndDate, setFreezeEndDate] = useState<Date | undefined>();
  const [isFreezing, setIsFreezing] = useState(false);
  const [isProfilePicOpen, setIsProfilePicOpen] = useState(false);
  
  // Section edit states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [isSavingSection, setIsSavingSection] = useState(false);
  
  // Edited data for each section
  const [editedPersonal, setEditedPersonal] = useState({
    name: member.name,
    email: member.email,
    phone: member.phone,
    dateOfBirth: member.dateOfBirth,
    gender: member.gender,
    age: member.age,
    address: member.address,
    biometricDeviceId: member.biometricDeviceId,
  });
  
  const [editedHealth, setEditedHealth] = useState({
    heightCm: member.heightCm,
    weightKg: member.weightKg,
    bmi: member.bmi,
    fitnessGoal: member.fitnessGoal,
    medicalConditions: member.medicalConditions,
  });
  
  const [editedEmergency, setEditedEmergency] = useState({
    emergencyContact: member.emergencyContact,
  });
  
  // Profile picture edit
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showProfileOptions, setShowProfileOptions] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  
  // Reset edited data when member changes
  React.useEffect(() => {
    setEditedPersonal({
      name: member.name,
      email: member.email,
      phone: member.phone,
      dateOfBirth: member.dateOfBirth,
      gender: member.gender,
      age: member.age,
      address: member.address,
      biometricDeviceId: member.biometricDeviceId,
    });
    setEditedHealth({
      heightCm: member.heightCm,
      weightKg: member.weightKg,
      bmi: member.bmi,
      fitnessGoal: member.fitnessGoal,
      medicalConditions: member.medicalConditions,
    });
    setEditedEmergency({
      emergencyContact: member.emergencyContact,
    });
  }, [member]);

  const getMembershipStatus = () => {
    if (!plan || !plan.membershipStart || !plan.membershipEnd) {
      return {
        status: "Expired",
        progress: 0,
        daysRemainingText: "No active plan",
        badgeColor: "bg-gray-500",
        effectiveStartDate: null,
        effectiveEndDate: null,
      };
    }

    const today = new Date();
    
    // Find all plans to check for continuous coverage
    const allPlans = (availablePlans || []).map(p => ({
      start: new Date(p.membershipStart),
      end: new Date(p.membershipEnd),
    })).sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Find the earliest start date of a plan that covers today or starts in the future
    let effectiveStartDate = new Date(plan.membershipStart);
    let effectiveEndDate = new Date(plan.membershipEnd);
    
    // Check if there's an active plan (covers today)
    const activePlan = allPlans.find(p => today >= p.start && today <= p.end);
    
    if (activePlan) {
      // Member has active coverage - find the continuous range
      effectiveStartDate = activePlan.start;
      effectiveEndDate = activePlan.end;
      
      // Check for consecutive/overlapping future plans
      let currentEnd = activePlan.end;
      for (const p of allPlans) {
        // If plan starts on or before current end (consecutive or overlapping)
        if (p.start <= currentEnd && p.end > currentEnd) {
          effectiveEndDate = p.end;
          currentEnd = p.end;
        }
      }
    } else {
      // No active plan - use the latest plan's dates
      effectiveStartDate = new Date(plan.membershipStart);
      effectiveEndDate = new Date(plan.membershipEnd);
    }

    // Now calculate status based on effective dates
    if (isBefore(today, effectiveStartDate)) {
      return {
        status: "Pending",
        progress: 0,
        daysRemainingText: `Starts in ${differenceInDays(effectiveStartDate, today)} days`,
        badgeColor: "bg-yellow-500",
        effectiveStartDate,
        effectiveEndDate,
      };
    }

    if (isAfter(today, effectiveEndDate)) {
      return {
        status: "Expired",
        progress: 100,
        daysRemainingText: `Expired ${differenceInDays(today, effectiveEndDate)} days ago`,
        badgeColor: "bg-red-500",
        effectiveStartDate,
        effectiveEndDate,
      };
    }

    // Active subscription
    const totalDuration = differenceInDays(effectiveEndDate, effectiveStartDate);
    const daysCompleted = differenceInDays(today, effectiveStartDate);
    const progress = totalDuration > 0 ? (daysCompleted / totalDuration) * 100 : 0;
    const daysRemaining = differenceInDays(effectiveEndDate, today);

    return {
      status: "Active",
      progress,
      daysRemainingText: `${daysRemaining} days remaining`,
      badgeColor: "bg-green-500",
      effectiveStartDate,
      effectiveEndDate,
    };
  };

  const { status, progress, daysRemainingText, badgeColor, effectiveStartDate, effectiveEndDate } = getMembershipStatus();

  const planName =
    (plan && availablePlans?.find((p) => p.id === plan.planId)?.name) ||
    plan?.planName ||
    "N/A";

  const handleAddPaymentClick = (history: any) => {
    setSelectedHistoryForPayment(history);
    setPaymentAmount(
      Math.max(0, history.price - history.paidAmount)
    );
    setPaymentDate(new Date()); // default today
    setPaymentType("cash");
    setPaymentOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedHistoryForPayment || !onPaymentSubmit) return;

    setIsSubmitting(true); // start loading
    try {
      await onPaymentSubmit(selectedHistoryForPayment.id, paymentAmount);
      // After successful submission, you might want to refetch data or update UI
      // For now, we just stop the loading state. The dialog remains open.
    } catch (err) {
      console.error("Payment submission failed:", err);
    } finally {
      setIsSubmitting(false); // stop loading
    }
  };

  const handleFreezeSubmit = () => {
    if (!selectedHistoryForPayment || !onFreezeSubmit || !freezeStartDate || !freezeEndDate) return;

    setIsFreezing(true);
    try {
      onFreezeSubmit(
        selectedHistoryForPayment.id,
        freezeStartDate,
        freezeEndDate
      );
      setFreezeOpen(false);
    } catch (err) {
      console.error("Freeze failed", err);
    } finally {
      setIsFreezing(false);
    }
  };

  // Section save/cancel handlers
  const firestore = useFirestore();
  const { user: adminUser } = useAuth();

  const handleSavePersonal = async () => {
    setIsSavingSection(true);
    try {
      await onUpdateMember(editedPersonal);
      
      // Log activity
      if (firestore && adminUser) {
        await logMemberUpdated(firestore, {
          userId: member.id,
          userName: editedPersonal.name,
          userEmail: editedPersonal.email,
          performedBy: adminUser.id,
          performedByName: adminUser.name || adminUser.email || "Admin",
        });
      }
      
      setIsEditingPersonal(false);
    } catch (error) {
      // Error is handled in parent
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleCancelPersonal = () => {
    setEditedPersonal({
      name: member.name,
      email: member.email,
      phone: member.phone,
      dateOfBirth: member.dateOfBirth,
      gender: member.gender,
      age: member.age,
      address: member.address,
      biometricDeviceId: member.biometricDeviceId,
    });
    setIsEditingPersonal(false);
  };

  const handleSaveHealth = async () => {
    setIsSavingSection(true);
    try {
      await onUpdateMember(editedHealth);
      
      // Log activity
      if (firestore && adminUser) {
        await logMemberUpdated(firestore, {
          userId: member.id,
          userName: member.name,
          userEmail: member.email,
          performedBy: adminUser.id,
          performedByName: adminUser.name || adminUser.email || "Admin",
        });
      }
      
      setIsEditingHealth(false);
    } catch (error) {
      // Error is handled in parent
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleCancelHealth = () => {
    setEditedHealth({
      heightCm: member.heightCm,
      weightKg: member.weightKg,
      bmi: member.bmi,
      fitnessGoal: member.fitnessGoal,
      medicalConditions: member.medicalConditions,
    });
    setIsEditingHealth(false);
  };

  const handleSaveEmergency = async () => {
    setIsSavingSection(true);
    try {
      await onUpdateMember(editedEmergency);
      
      // Log activity
      if (firestore && adminUser) {
        await logMemberUpdated(firestore, {
          userId: member.id,
          userName: member.name,
          userEmail: member.email,
          performedBy: adminUser.id,
          performedByName: adminUser.name || adminUser.email || "Admin",
        });
      }
      
      setIsEditingEmergency(false);
    } catch (error) {
      // Error is handled in parent
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleCancelEmergency = () => {
    setEditedEmergency({
      emergencyContact: member.emergencyContact,
    });
    setIsEditingEmergency(false);
  };

  // Profile picture handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Here you would upload to Firebase Storage and update member.profileImageUrl
    // For now, just show the options dialog closed
    setShowProfileOptions(false);
  };

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setShowWebcam(true);
      setShowProfileOptions(false);
    } catch (error) {
      console.error('Error accessing webcam:', error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          // Upload blob to Firebase Storage and update profileImageUrl
          stopWebcam();
        }
      });
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowWebcam(false);
  };

  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const bmiValue = parseFloat(member.bmi as any);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              {!isEditingPersonal ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditingPersonal(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancelPersonal}
                    disabled={isSavingSection}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSavePersonal}
                    disabled={isSavingSection}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSavingSection ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailItem 
                label="Full Name" 
                value={isEditingPersonal ? editedPersonal.name : member.name}
                isEditable={isEditingPersonal}
                onValueChange={(val) => setEditedPersonal({ ...editedPersonal, name: val })}
              />
              <DetailItem 
                label="Email Address" 
                value={isEditingPersonal ? editedPersonal.email : member.email}
                isEditable={isEditingPersonal}
                type="email"
                onValueChange={(val) => setEditedPersonal({ ...editedPersonal, email: val })}
              />
              <DetailItem 
                label="Phone Number" 
                value={isEditingPersonal ? editedPersonal.phone : member.phone}
                isEditable={isEditingPersonal}
                type="tel"
                onValueChange={(val) => setEditedPersonal({ ...editedPersonal, phone: val })}
              />
              <DetailItem
                label="Date of Birth"
                value={isEditingPersonal ? editedPersonal.dateOfBirth : format(parseISO(member.dateOfBirth), "PPP")}
                isEditable={isEditingPersonal}
                type="date"
                onValueChange={(val) => setEditedPersonal({ ...editedPersonal, dateOfBirth: val })}
              />
              <DetailItem 
                label="Gender" 
                value={isEditingPersonal ? editedPersonal.gender : member.gender}
                isEditable={isEditingPersonal}
                type="select"
                options={[
                  { label: "Male", value: "Male" },
                  { label: "Female", value: "Female" },
                  { label: "Other", value: "Other" },
                ]}
                onValueChange={(val) => setEditedPersonal({ ...editedPersonal, gender: val })}
              />
              <DetailItem 
                label="Age" 
                value={isEditingPersonal ? `${editedPersonal.age}` : `${member.age}`}
                isEditable={isEditingPersonal}
                type="number"
                onValueChange={(val) => setEditedPersonal({ ...editedPersonal, age: parseInt(val) || 0 })}
              />
              <div className="md:col-span-2">
                <DetailItem 
                  label="Address" 
                  value={isEditingPersonal ? editedPersonal.address : member.address}
                  isEditable={isEditingPersonal}
                  type="textarea"
                  onValueChange={(val) => setEditedPersonal({ ...editedPersonal, address: val })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Health & Fitness
              </CardTitle>
              {!isEditingHealth ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditingHealth(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancelHealth}
                    disabled={isSavingSection}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveHealth}
                    disabled={isSavingSection}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSavingSection ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailItem 
                label="Height" 
                value={isEditingHealth ? `${editedHealth.heightCm}` : `${member.heightCm}`}
                isEditable={isEditingHealth}
                type="number"
                onValueChange={(val) => setEditedHealth({ ...editedHealth, heightCm: parseFloat(val) || 0 })}
              />
              <DetailItem 
                label="Weight" 
                value={isEditingHealth ? `${editedHealth.weightKg}` : `${member.weightKg}`}
                isEditable={isEditingHealth}
                type="number"
                onValueChange={(val) => setEditedHealth({ ...editedHealth, weightKg: parseFloat(val) || 0 })}
              />
              <DetailItem
                label="BMI"
                value={!isNaN(bmiValue) ? bmiValue.toFixed(1) : "N/A"}
              />
              <DetailItem
                label="Primary Fitness Goal"
                value={isEditingHealth ? editedHealth.fitnessGoal : member.fitnessGoal}
                isEditable={isEditingHealth}
                type="select"
                options={[
                  { label: "Weight Loss", value: "Weight Loss" },
                  { label: "Muscle Gain", value: "Muscle Gain" },
                  { label: "General Fitness", value: "General Fitness" },
                  { label: "Strength Training", value: "Strength Training" },
                  { label: "Cardio", value: "Cardio" },
                ]}
                onValueChange={(val) => setEditedHealth({ ...editedHealth, fitnessGoal: val })}
              />
              <div className="md:col-span-2">
                <DetailItem
                  label="Medical Conditions"
                  value={isEditingHealth ? editedHealth.medicalConditions.join(", ") : (member.medicalConditions.join(", ") || "None")}
                  isEditable={isEditingHealth}
                  type="textarea"
                  onValueChange={(val) => setEditedHealth({ ...editedHealth, medicalConditions: val.split(",").map(c => c.trim()).filter(c => c) })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Emergency Contact
              </CardTitle>
              {!isEditingEmergency ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditingEmergency(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancelEmergency}
                    disabled={isSavingSection}
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveEmergency}
                    disabled={isSavingSection}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSavingSection ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailItem
                label="Contact Name"
                value={isEditingEmergency ? editedEmergency.emergencyContact.name : member.emergencyContact.name}
                isEditable={isEditingEmergency}
                onValueChange={(val) => setEditedEmergency({ emergencyContact: { ...editedEmergency.emergencyContact, name: val } })}
              />
              <DetailItem
                label="Contact Phone"
                value={isEditingEmergency ? editedEmergency.emergencyContact.phone : member.emergencyContact.phone}
                isEditable={isEditingEmergency}
                type="tel"
                onValueChange={(val) => setEditedEmergency({ emergencyContact: { ...editedEmergency.emergencyContact, phone: val } })}
              />
              <DetailItem
                label="Relationship"
                value={isEditingEmergency ? editedEmergency.emergencyContact.relation : member.emergencyContact.relation}
                isEditable={isEditingEmergency}
                onValueChange={(val) => setEditedEmergency({ emergencyContact: { ...editedEmergency.emergencyContact, relation: val } })}
              />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-8">
          <Card>
            <CardHeader className="items-center text-center relative">
              <div className="flex flex-col items-center gap-3 mb-4">
                <div 
                  className="relative inline-block group"
                  onMouseEnter={() => setShowProfileOptions(true)}
                  onMouseLeave={() => setShowProfileOptions(false)}
                >
                  <Dialog open={isProfilePicOpen} onOpenChange={setIsProfilePicOpen}>
                    <DialogTrigger asChild>
                      <Avatar className="h-24 w-24 cursor-pointer">
                        <AvatarImage src={member.profileImageUrl} alt={member.name} />
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg p-0 border-0">
                      <div className="relative">
                        <img src={member.profileImageUrl} alt={member.name} className="w-full h-auto rounded-lg" />
                        <DialogClose asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full hover:bg-red-600 focus:ring-red-500"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                          </Button>
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {showProfileOptions && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-lg"
                            onClick={() => setIsEditingProfile(!isEditingProfile)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Profile Picture</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {isEditingProfile && (
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={startWebcam}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Capture
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Take a photo with webcam</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById('profile-upload')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Upload from device</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <input
                      id="profile-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                )}
              </div>
              <CardTitle>{member.name}</CardTitle>
              <CardDescription>{member.email}</CardDescription>
              <Badge className={`absolute top-4 right-4 ${badgeColor}`}>{status}</Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              {plan ? (
                <div>
                  <p className="text-sm font-medium mb-2 text-muted-foreground">
                    Membership Period
                  </p>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>
                      {effectiveStartDate && format(effectiveStartDate, "do MMM yyyy")}
                    </span>
                    <span>
                      {effectiveEndDate && format(effectiveEndDate, "do MMM yyyy")}
                    </span>
                  </div>
                  <p className="text-center text-sm font-semibold mt-2">{daysRemainingText}</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p>No active membership plan.</p>
                </div>
              )}
              <DetailItem
                label="Join Date"
                value={format(parseISO(member.joinDate), "PPP")}
              />
              <DetailItem
                label="Biometric Device ID"
                value={member.biometricDeviceId || "N/A"}
              />
              {availablePlans?.length > 0 && (
                <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-2 w-full">
                      View Membership History
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Membership History for {member.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                      {availablePlans
                        .slice()
                        .reverse() // latest first
                        .map((history, index) => {
                          const paymentStatus =
                            history.paidAmount >= history.price
                              ? "paid"
                              : history.paidAmount > 0
                              ? "partial"
                              : "pending";

                          const paymentProgress = history.price > 0 ? (history.paidAmount / history.price) * 100 : 100;
                          const totalFrozenDays = history.freezeHistory?.reduce((acc: number, freeze: any) => acc + freeze.freezeDuration, 0) || 0;
                          const planDuration = differenceInDays(new Date(history.membershipEnd), new Date(history.membershipStart)) - totalFrozenDays;

                          const statusBadges: Record<string, React.ReactNode> = {
                            paid: <Badge variant="default" className="bg-green-600">Paid</Badge>,
                            partial: <Badge variant="default" className="bg-yellow-500">Partial</Badge>,
                            pending: <Badge variant="destructive">Pending</Badge>,
                          };

                          return (
                            <Card key={index} className="transition-all hover:shadow-md">
                              <CardHeader className="flex-row items-start justify-between p-4">
                                <div>
                                  <CardTitle className="text-lg">{history.membershipPlan}</CardTitle>
                                  <CardDescription>{planDuration} days plan</CardDescription>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <div className="flex items-center gap-1">
                                    {index === 0 && <Badge variant="outline">Latest</Badge>}
                                    {statusBadges[paymentStatus]}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <TooltipProvider>
                                      {paymentStatus !== 'paid' && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddPaymentClick(history)}>
                                              <CreditCard className="h-4 w-4 text-gray-600" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent><p>Add Payment</p></TooltipContent>
                                        </Tooltip>
                                      )}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                            setSelectedHistoryForPayment(history);
                                            setFreezeStartDate(new Date(history.membershipStart));
                                            setFreezeEndDate(new Date(history.membershipEnd));
                                            setFreezeOpen(true);
                                          }}>
                                            <Snowflake className="h-4 w-4 text-blue-600" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Freeze Plan</p></TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onHandleDelete(history.id)}>
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Delete Plan</p></TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-4 pt-2">
                                <div className="space-y-2">
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm font-medium">Payment</span>
                                      <span className="text-sm font-semibold">
                                        ₹{history.paidAmount.toLocaleString()} / ₹{history.price.toLocaleString()}
                                      </span>
                                    </div>
                                    <Progress value={paymentProgress} className="h-2" />
                                  </div>
                                  <div className="text-xs text-muted-foreground pt-1">
                                    <p>Period: {history.membershipStart ? format(new Date(history.membershipStart), "dd/MM/yy") : "N/A"} - {history.membershipEnd ? format(new Date(history.membershipEnd), "dd/MM/yy") : "N/A"}</p>
                                    <p>Added on: {history.createdAt?.seconds ? format(new Date(history.createdAt.seconds * 1000), "PPP") : "Date not available"}</p>
                                  </div>
                                  {history.freezeHistory && history.freezeHistory.length > 0 && (
                                    <Accordion type="single" collapsible className="w-full">
                                      <AccordionItem value="item-1">
                                        <AccordionTrigger className="text-xs">View Freeze History ({history.freezeHistory.length})</AccordionTrigger>
                                        <AccordionContent>
                                          <ul className="space-y-1 text-xs">
                                            {history.freezeHistory.map((freeze: any, i: number) => (
                                              <li key={i}>
                                                Frozen for {freeze.freezeDuration} days ({format(freeze.freezeStart.toDate(), "dd/MM/yy")} - {format(freeze.freezeEnd.toDate(), "dd/MM/yy")})
                                              </li>
                                            ))}
                                          </ul>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setHistoryOpen(false)}>
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment for {selectedHistoryForPayment?.membershipPlan}</DialogTitle>
            <DialogDescription>
              Recording a new payment for {member.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-2">
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? (
                      format(paymentDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown-buttons"
                    selected={paymentDate}
                    onSelect={setPaymentDate}
                    initialFocus
                    fromYear={new Date().getFullYear() - 100}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Payment Amount</Label>
                <span className="text-xs text-muted-foreground">
                  Due: ₹{selectedHistoryForPayment ? (selectedHistoryForPayment.price - selectedHistoryForPayment.paidAmount).toLocaleString() : 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={paymentAmount}
                  max={
                    selectedHistoryForPayment
                      ? selectedHistoryForPayment.price - selectedHistoryForPayment.paidAmount
                      : 0
                  }
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="Enter amount"
                />
                <Button
                  variant="outline"
                  onClick={() => setPaymentAmount(selectedHistoryForPayment.price - selectedHistoryForPayment.paidAmount)}
                >
                  Full
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Payment Type</Label>
              <RadioGroup
                defaultValue="cash"
                className="grid grid-cols-3 gap-4"
                value={paymentType}
                onValueChange={setPaymentType}
              >
                <Label className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                  <RadioGroupItem value="cash" id="cash" className="sr-only" />
                  <Wallet className="mb-3 h-6 w-6" />
                  Cash
                </Label>
                <Label className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                  <RadioGroupItem value="card" id="card" className="sr-only" />
                  <CreditCard className="mb-3 h-6 w-6" />
                  Card
                </Label>
                <Label className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                  <RadioGroupItem value="upi" id="upi" className="sr-only" />
                  <Landmark className="mb-3 h-6 w-6" />
                  UPI
                </Label>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button onClick={() => setPaymentOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={handlePaymentSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? "Submitting..." : "Submit Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Freeze Membership</DialogTitle>
            <DialogDescription>
              Select a start and end date to freeze the membership.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="freeze-start">Freeze Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !freezeStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {freezeStartDate ? (
                      format(freezeStartDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown-buttons"
                    selected={freezeStartDate}
                    onSelect={setFreezeStartDate}
                    initialFocus
                    fromDate={
                      selectedHistoryForPayment && new Date(selectedHistoryForPayment.membershipStart)
                    }
                    toDate={
                      selectedHistoryForPayment && new Date(selectedHistoryForPayment.membershipEnd)
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="freeze-end">Freeze End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !freezeEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {freezeEndDate ? (
                      format(freezeEndDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown-buttons"
                    selected={freezeEndDate}
                    onSelect={setFreezeEndDate}
                    initialFocus
                    fromDate={
                      freezeStartDate ||
                      (selectedHistoryForPayment &&
                        new Date(selectedHistoryForPayment.membershipStart))
                    }
                    toDate={
                      selectedHistoryForPayment && new Date(selectedHistoryForPayment.membershipEnd)
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleFreezeSubmit} disabled={isFreezing}>
              {isFreezing ? "Freezing..." : "Submit Freeze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showWebcam} onOpenChange={(open) => { if (!open) stopWebcam(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Take Profile Photo</DialogTitle>
            <DialogDescription>
              Position yourself in the frame and click capture when ready.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex justify-center gap-4">
              <Button onClick={stopWebcam} variant="outline">
                <XIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={capturePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
