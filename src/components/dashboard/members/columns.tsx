// columns.tsx
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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive focus:bg-destructive/10">
          Delete member
        </div>
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
