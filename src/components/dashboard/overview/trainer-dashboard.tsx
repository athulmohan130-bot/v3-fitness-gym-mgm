import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { format, formatDistanceToNow } from 'date-fns';
import { useFirestore } from "@/firebase"; // Assuming this hook exists based on other files
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { AttendanceRecord, GymUser, UserSummary } from "@/lib/types"; // Assuming types exist
import { Users, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface TrainerDashboardProps {
  // Add props if needed in future
}

import { useAuth } from "@/lib/auth-provider";

export function TrainerDashboard({ }: TrainerDashboardProps) {
  const firestore = useFirestore();
  const { user } = useAuth();

  // Debugging user role
  if (user) {
    console.log("TrainerDashboard - Current User:", {
      uid: user.uid || user.id,
      role: user.role
    });
  }

  // Fetch Global User Stats (Reusing logic from Admin Dashboard)
  const { data: userSummary, isLoading: summaryLoading } = useQuery<UserSummary | null>({
    queryKey: ['userSummary'],
    queryFn: async () => {
      if (!firestore) return null;
      const docRef = doc(firestore, 'stats/userSummary');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as UserSummary : null;
    },
    enabled: !!firestore,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const activeSubscriptions = userSummary?.activeMembers || 0;
  const totalMembers = userSummary?.totalMembers || 0;
  const inactiveMembers = totalMembers - activeSubscriptions;
  const newMembersCount = userSummary?.newMembersThisMonth || 0;

  // Fetch Today's Check-ins
  const { data: todaysCheckins, isLoading: checkinsLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['todaysCheckins'],
    queryFn: async () => {
      if (!firestore) return [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Note: Ideally we filter by date in query, but string date format in types makes it tricky without index.
      // Fetching recent checkins and filtering in memory for now, similar to original mock logic but with real data.
      // Optimally: query(collection(firestore, 'attendance'), where('date', '==', todayString))

      const todayString = format(todayStart, 'yyyy-MM-dd');
      // querying the correct path consistent with AttendancePage
      const q = query(collection(firestore, `attendance_logs/${todayString}/records`), orderBy('checkInTime', 'desc'));
      try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      } catch (e) {
        console.error("Error fetching attendance:", e);
        return [];
      }
    },
    enabled: !!firestore
  });

  // Fetch Recent Members (Simulating "My Members" or just recent list for now)
  const { data: recentMembers, isLoading: membersLoading } = useQuery<GymUser[]>({
    queryKey: ['recentMembersTrainer'],
    queryFn: async () => {
      if (!firestore) return [];
      try {
        const q = query(collection(firestore, 'users'), where('role', '==', 'member'), orderBy('joinDate', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GymUser));
      } catch (err: any) {
        console.error("Error fetching recent members:", err);
        // If index is missing, firebase returns a link in the error message
        if (err.message && err.message.includes("indexes")) {
          console.log("Missing Index Link:", err.message);
        }
        return [];
      }
    },
    enabled: !!firestore
  });

  const isLoading = summaryLoading || checkinsLoading || membersLoading;

  if (isLoading) {
    return <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32" /><Skeleton className="h-32" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="lg:col-span-2 h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Member Status - Blue/Amber (Copied style from Admin) */}
        <Card className={cn(
          "border-l-4 hover:shadow-xl transition-shadow group overflow-hidden relative",
          inactiveMembers > 0 ? "border-l-amber-500" : "border-l-blue-500"
        )}>
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-300",
            inactiveMembers > 0 ? "bg-amber-500/5" : "bg-blue-500/5"
          )} />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Member Status</CardTitle>
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              inactiveMembers > 0 ? "bg-amber-500/10" : "bg-blue-500/10"
            )}>
              <Users className={cn("h-5 w-5", inactiveMembers > 0 ? "text-amber-600" : "text-blue-600")} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tracking-tight">{activeSubscriptions}</div>
              <span className="text-lg text-muted-foreground">/ {totalMembers}</span>
            </div>
            <div className="space-y-1.5">
              {inactiveMembers > 0 ? (
                <>
                  <p className="text-sm text-amber-600 font-medium">
                    ⚠ {inactiveMembers} inactive member{inactiveMembers > 1 ? 's' : ''} need{inactiveMembers === 1 ? 's' : ''} attention
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalMembers > 0 ? Math.round((activeSubscriptions / totalMembers) * 100) : 0}% active
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-emerald-600 font-medium">
                    ✓ All members active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    100% retention
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* New Members This Month - Purple */}
        <Card className="border-l-4 border-l-purple-500 hover:shadow-xl transition-shadow group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-300" />
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">New This Month</CardTitle>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tracking-tight">+{newMembersCount}</div>
              <span className="text-lg text-muted-foreground">members</span>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm text-purple-600 font-medium">
                {totalMembers > 0 && newMembersCount > 0 ? `${Math.round((newMembersCount / totalMembers) * 100)}% of total base` : 'Start of the month'}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'MMMM yyyy')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Check-ins ({format(new Date(), 'do MMMM yyyy')})</CardTitle>
              <CardDescription>Members who have checked in today.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaysCheckins && todaysCheckins.length > 0 ? todaysCheckins.map(att => (
                    <TableRow key={att.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={att.profileImageUrl} alt={att.name} />
                            <AvatarFallback>{att.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{att.name}</div>
                            <div className="text-sm text-muted-foreground">{att.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(att.checkInTime), 'p')}</TableCell>
                      <TableCell>
                        <Badge variant={att.status === 'present' ? 'default' : 'destructive'} className="bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">Present</Badge>
                      </TableCell>
                    </TableRow>
                  )
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">No check-ins yet today.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Members</CardTitle>
              <CardDescription>Newest members requested.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentMembers && recentMembers.length > 0 ? recentMembers.map(member => (
                <div key={member.id} className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profileImageUrl} alt={member.name} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">{member.fitnessGoal || 'No goal set'}</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{formatDistanceToNow(new Date(member.joinDate), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {member.medicalConditions && member.medicalConditions.length > 0 && <Badge variant="destructive" className="h-6">Alert</Badge>}
                </div>
              )) : (
                <div className="text-center text-muted-foreground">No members found.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

