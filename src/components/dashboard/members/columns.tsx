// columns.tsx
import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { GymUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, isBefore, isAfter } from "date-fns";
import { RenewPlanDialog } from "./renew-plan-dialogue";
import { cn } from "@/lib/utils";
import { useNotificationToast } from "@/hooks/use-notification-toast";
import { logMemberDeleted } from "@/lib/activity-logger";
import { useAuth } from "@/lib/auth-provider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteDocumentNonBlocking, useFirestore } from "@/firebase";
import { useQueryClient } from "@tanstack/react-query";
import { doc, runTransaction, increment } from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getInitials, getAvatarStyle, capitalizeName } from "@/lib/avatar-utils";

type UserWithPlan = GymUser & { planName: string };

const MembershipStatusBadge = ({ user }: { user: UserWithPlan }) => {
  const today = new Date();
  const membershipEnd = user.membershipEnd ? new Date(user.membershipEnd) : null;
  const membershipStart = user.membershipStart ? new Date(user.membershipStart) : null;

  let status: 'active' | 'expired' | 'pending' = user.membershipStatus as any;
  let tooltipContent = "";

  if (membershipStart && isBefore(today, membershipStart)) {
    status = 'pending';
    tooltipContent = `Starts in ${differenceInDays(membershipStart, today)} days`;
  } else if (membershipEnd && isAfter(today, membershipEnd)) {
    status = 'expired';
    tooltipContent = `Expired ${differenceInDays(today, membershipEnd)} days ago`;
  } else if (membershipEnd) {
    status = 'active';
    tooltipContent = `Expires in ${differenceInDays(membershipEnd, today)} days`;
  } else {
    tooltipContent = "No active plan";
  }

  const statusClasses: Record<string, string> = {
    active: "bg-green-100 text-green-800 border-green-200",
    expired: "bg-red-100 text-red-800 border-red-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className={cn("capitalize", statusClasses[status])}>
            {status}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const DeleteMemberButton = ({ user }: { user: UserWithPlan }) => {
  const { toast } = useNotificationToast();
  const firestore = useFirestore();
  const storage = getStorage();
  const queryClient = useQueryClient();
  const { user: adminUser } = useAuth();
  const [open, setOpen] = React.useState(false);

  const handleDelete = async () => {
    if (!firestore) return;

    const userDocRef = doc(firestore, "users", user.id);
    const userSummaryRef = doc(firestore, "stats/userSummary");

    try {
      await runTransaction(firestore, async (transaction) => {
        const summaryDoc = await transaction.get(userSummaryRef);
        if (!summaryDoc.exists()) return;

        // Perform deletion and summary update in one transaction
        transaction.delete(userDocRef);

        const summaryData = summaryDoc.data();
        const updates: { [key: string]: any } = {};

        if (summaryData.totalMembers > 0) {
          updates.totalMembers = increment(-1);
        }
        if (user.membershipStatus === 'active' && summaryData.activeMembers > 0) {
          updates.activeMembers = increment(-1);
        }

        if (Object.keys(updates).length > 0) {
          transaction.update(userSummaryRef, updates);
        }
      });

      // After successful deletion from Firestore, delete profile picture from Storage
      if (user.profileImageUrl && !user.profileImageUrl.includes("picsum.photos")) {
        try {
          const imageRef = ref(storage, user.profileImageUrl);
          await deleteObject(imageRef);
        } catch (error: any) {
          // Log error if image deletion fails but don't block the success message
          if (error.code !== 'storage/object-not-found') {
            console.warn("Could not delete profile image:", error);
          }
        }
      }

      toast({
        title: "Member Deletion Successful",
        description: `${user.name} has been removed from the system.`,
      });

      // Log activity
      if (adminUser) {
        await logMemberDeleted(firestore, {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          performedBy: adminUser.id,
          performedByName: adminUser.name || adminUser.email || "Admin",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["processedMembers"] });
      queryClient.invalidateQueries({ queryKey: ["userSummary"] });
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });

      // Close the dialog
      setOpen(false);

    } catch (error) {
      console.error("Error deleting member:", error);
      toast({
        title: "Deletion Failed",
        description: "An error occurred while deleting the member.",
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            member account for <span className="font-bold">{user.name}</span>{" "}
            and remove their data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Yes, delete member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getColumns = (
  setRenewOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setSelectedMember: React.Dispatch<React.SetStateAction<UserWithPlan | null>>,
  availablePlans: any[],
  onPaymentSubmit: (memberId: string, historyId: string, amount: number, paymentDate: Date) => void
): ColumnDef<UserWithPlan>[] => [
  {
    accessorKey: "biometricDeviceId",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Member ID
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span>{row.getValue("biometricDeviceId") || "—"}</span>,
    sortingFn: (rowA, rowB) => {
      const a = parseInt(rowA.getValue("biometricDeviceId") || "0", 10);
      const b = parseInt(rowB.getValue("biometricDeviceId") || "0", 10);
      return a - b;
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Member
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const user = row.original;
      const initials = getInitials(user.name);
      const avatarStyle = getAvatarStyle(user.name);
      const displayName = capitalizeName(user.name);

      return (
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center font-semibold shrink-0"
            style={{
              ...avatarStyle,
              minWidth: '40px',
              minHeight: '40px'
            }}
          >
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="font-medium">{displayName}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "membershipStatus",
    header: "Membership Status",
    cell: ({ row }) => <MembershipStatusBadge user={row.original} />,
  },
  {
    accessorKey: "planName",
    header: "Plan",
  },
  {
    accessorKey: "membershipEnd",
    header: "Expiry Date",
    cell: ({ row }) => {
      const membershipEnd = row.getValue("membershipEnd") as string;
      if (!membershipEnd) return <span className="text-muted-foreground">—</span>;

      const endDate = new Date(membershipEnd);
      return <span className="font-medium">{format(endDate, "dd MMM yyyy")}</span>;
    },
  },
  {
    accessorKey: "daysRemaining",
    header: "Days Remaining",
    cell: ({ row }) => {
      const membershipEnd = row.original.membershipEnd;
      if (!membershipEnd) return <span className="text-muted-foreground">—</span>;

      const endDate = new Date(membershipEnd);
      const today = new Date();
      const daysRemaining = differenceInDays(endDate, today);

      // Determine badge color and style based on days remaining
      let badgeClass = "";
      let badgeText = "";

      if (daysRemaining < 0) {
        // Expired - Red
        badgeClass = "bg-red-100 text-red-800 border-red-200";
        badgeText = `Expired (${Math.abs(daysRemaining)}d ago)`;
      } else if (daysRemaining === 0) {
        // Expires today - Red
        badgeClass = "bg-red-100 text-red-800 border-red-200";
        badgeText = "Expires today";
      } else if (daysRemaining < 3) {
        // Less than 3 days - Darker Amber (more urgent)
        badgeClass = "bg-amber-200 text-amber-900 border-amber-300";
        badgeText = `${daysRemaining}d left`;
      } else if (daysRemaining < 10) {
        // Less than 10 days - Amber
        badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
        badgeText = `${daysRemaining}d left`;
      } else {
        // 10 days or more - Green
        badgeClass = "bg-green-100 text-green-800 border-green-200";
        badgeText = `${daysRemaining}d left`;
      }

      return (
        <Badge className={cn("font-medium", badgeClass)}>
          {badgeText}
        </Badge>
      );
    },
  },
  {
    accessorKey: "joinDate",
    header: "Join Date",
    cell: ({ row }) => (
      <span>{format(new Date(row.getValue("joinDate")), "dd MMM yyyy")}</span>
    ),
  },
  // {
  //   accessorKey: "renewalDate",
  //   header: "Renewal Date",
  //   cell: ({ row }) => (
  //     <span>
  //       {format(new Date(row.getValue("renewalDate")), "dd MMM yyyy")}
  //     </span>
  //   ),
  // },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    setSelectedMember(user);
                    setRenewOpen(true);
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Renew Plan</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DeleteMemberButton user={user} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Member</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },
];
