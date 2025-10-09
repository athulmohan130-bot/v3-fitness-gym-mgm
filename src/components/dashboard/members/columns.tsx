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
import { format } from "date-fns";
import { RenewPlanDialog } from "./renew-plan-dialogue";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { deleteDocumentNonBlocking, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
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

const DeleteMemberDialog = ({ user }: { user: UserWithPlan }) => {
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleDelete = () => {
    if (!firestore) return;
    const userDocRef = doc(firestore, "users", user.id);
    deleteDocumentNonBlocking(userDocRef);

    toast({
      title: "Member Deletion Initiated",
      description: `${user.name} will be removed from the system.`,
      variant: "destructive",
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive focus:bg-destructive/10">
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
  availablePlans: any[]
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
            <AvatarImage src={user.profileImageUrl} alt={user.name} />
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
    cell: ({ row }) => {
      const original = row.original as any;
      const status = row.getValue("membershipStatus") as string;
      const membershipEnd = original.membershipEnd
        ? new Date(original.membershipEnd)
        : null;
      const today = new Date();
      let displayStatus = status;
      if (membershipEnd && membershipEnd < today) {
        displayStatus = "expired";
      }
      const statusClasses: Record<string, string> = {
        active: "bg-green-500/20 text-green-700 ...",
        expired: "bg-red-500/20 text-red-700 ...",
        pending: "bg-yellow-500/20 text-yellow-700 ...",
      };
      return (
        <Badge
          className={cn("capitalize", statusClasses[displayStatus] || "")}
          variant="outline"
        >
          {displayStatus || "N/A"}
        </Badge>
      );
    },
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
  {
    accessorKey: "renewalDate",
    header: "Renewal Date",
    cell: ({ row }) => (
      <span>
        {format(new Date(row.getValue("renewalDate")), "dd MMM yyyy")}
      </span>
    ),
  },
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
            {isExpired && (
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
            )}
            <DropdownMenuSeparator />
            <DeleteMemberDialog user={user} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
