"use client";

import { useState } from "react";
import { useMemoFirebase, useCollection, useFirestore } from "@/firebase";
import { collection, query, where, deleteDoc, doc } from "firebase/firestore";
import type { GymUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserCog, Loader2, Trash2 } from "lucide-react";

export function StaffList() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<GymUser | null>(null);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "users"),
      where("role", "in", ["admin", "trainer"])
    );
  }, [firestore]);

  const { data: staffMembers, isLoading, error } = useCollection<GymUser>(staffQuery);

  const handleDeleteClick = (staff: GymUser) => {
    setStaffToDelete(staff);
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete || !firestore) return;

    setDeletingId(staffToDelete.id);

    try {
      await deleteDoc(doc(firestore, "users", staffToDelete.id));

      toast({
        title: "Success",
        description: `${staffToDelete.role === "admin" ? "Admin" : "Trainer"} removed successfully`,
      });

      setStaffToDelete(null);
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast({
        title: "Error",
        description: "Failed to remove staff member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading staff members...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
        Failed to load staff members
      </div>
    );
  }

  if (!staffMembers || staffMembers.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
        No staff members registered yet
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {staffMembers.map((staff) => (
          <Card key={staff.id} className="p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {staff.role === "admin" ? (
                    <Shield className="h-4 w-4 text-primary" />
                  ) : (
                    <UserCog className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{staff.name}</p>
                    <Badge
                      variant={staff.role === "admin" ? "default" : "secondary"}
                      className="h-5 text-[10px] px-2"
                    >
                      {staff.role === "admin" ? "Admin" : "Trainer"}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    {staff.phone && (
                      <p className="text-xs text-muted-foreground">
                        📞 {staff.phone}
                      </p>
                    )}
                    {staff.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        ✉️ {staff.email}
                      </p>
                    )}
                    {staff.username && (
                      <p className="text-xs text-muted-foreground">
                        👤 Username: <span className="font-mono">{staff.username}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteClick(staff)}
                disabled={deletingId === staff.id}
              >
                {deletingId === staff.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !open && setStaffToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {staffToDelete?.role === "admin" ? "Admin" : "Trainer"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold">{staffToDelete?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
