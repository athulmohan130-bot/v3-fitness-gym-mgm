// columns.tsx
import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { GymUser } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { format, differenceInDays, isBefore, isAfter } from "date-fns";
import { RenewPlanDialog } from "./renew-plan-dialogue";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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

const DeleteMemberDialog = ({ user }: { user: UserWithPlan }) => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = getStorage();
  const queryClient = useQueryClient();
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

      queryClient.invalidateQueries({ queryKey: ["processedMembers"] });
      queryClient.invalidateQueries({ queryKey: ["userSummary"] });

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
    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <button className="w-full text-left">
            <span className="text-destructive text-sm">Delete member</span>
          </button>
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
    </DropdownMenuItem>
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
    header: "Member ID",
    cell: ({ row }) => <span>{row.getValue("biometricDeviceId") || "—"}</span>,
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
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={user.name} />}
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            <span className="text-sm text-muted-foreground">{user.email}</span>
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
    cell: ({ row }) => {
      const user = row.original;
      const membershipEnd = user.membershipEnd
        ? new Date(user.membershipEnd)
        : null;
      const isExpired = membershipEnd && membershipEnd < new Date();

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy member ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/members/view/${user.id}`}>
                View details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/members/edit/${user.id}`}>
                Edit member
              </Link>
            </DropdownMenuItem>
            {/* {isExpired && ( */}
              <DropdownMenuItem
                onClick={() => {
                  setSelectedMember(user);
                  setRenewOpen(true);
                }}
              >
                <span className="flex items-center gap-2 font-medium text-yellow-700 hover:text-white">
                  Renew Plan
                </span>
              </DropdownMenuItem>
            {/* )} */}
            <DropdownMenuSeparator />
            <DeleteMemberDialog user={user} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
