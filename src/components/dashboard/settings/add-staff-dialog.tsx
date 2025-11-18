"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { useFirestore, useAuth } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/lib/types";

export function AddStaffDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "admin" as UserRole,
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firestore || !auth) {
      toast({
        title: "Error",
        description: "Services not available",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if username already exists
      const usernameQuery = query(
        collection(firestore, "users"),
        where("username", "==", formData.username)
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        toast({
          title: "Error",
          description: "Username already exists. Please choose a different username.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const userId = userCredential.user.uid;

      // Create Firestore document with the same UID
      const staffData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        // Authentication credentials (for username login fallback)
        username: formData.username,
        password: formData.password, // Stored for username-based auth
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

      // Use setDoc with the Firebase Auth UID
      await setDoc(doc(firestore, "users", userId), staffData);

      toast({
        title: "Success",
        description: `${formData.role === "admin" ? "Admin" : "Trainer"} added successfully`,
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "admin",
        username: "",
        password: "",
      });
      setOpen(false);
    } catch (error: any) {
      console.error("Error adding staff:", error);

      let errorMessage = "Failed to add staff member. Please try again.";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Admin / Trainer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Admin / Trainer</DialogTitle>
          <DialogDescription>
            Add a new admin or trainer. They will not appear in member or attendance lists.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 XXXXXXXXXX"
                required
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-3">Login Credentials</h4>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="admin123"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="space-y-2 mt-3">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter a secure password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 6 characters
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Staff"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
