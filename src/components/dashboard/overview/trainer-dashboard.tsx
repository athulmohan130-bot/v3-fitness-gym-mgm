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
import { MOCK_USERS, MOCK_ATTENDANCE } from "@/lib/placeholder-data"
import { format } from 'date-fns';

export function TrainerDashboard() {
  const today = new Date();
  const todaysCheckins = MOCK_ATTENDANCE.filter(a => new Date(a.checkInTime).toDateString() === today.toDateString());
  const assignedMembers = MOCK_USERS.filter(u => u.role === 'member');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Check-ins ({format(today, 'do MMMM yyyy')})</CardTitle>
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
                {todaysCheckins.length > 0 ? todaysCheckins.map(att => {
                    const user = MOCK_USERS.find(u => u.id === att.userId);
                    return (
                        <TableRow key={att.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user?.profileImageUrl} alt={user?.name} />
                                    <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">{user?.name}</div>
                                    <div className="text-sm text-muted-foreground">{user?.email}</div>
                                </div>
                                </div>
                            </TableCell>
                            <TableCell>{format(new Date(att.checkInTime), 'p')}</TableCell>
                            <TableCell>
                                <Badge variant={att.status === 'present' ? 'default' : 'destructive'} className="bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">Present</Badge>
                            </TableCell>
                        </TableRow>
                    )
                }) : (
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
            <CardTitle>My Members</CardTitle>
            <CardDescription>Members assigned to you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {assignedMembers.slice(0,5).map(member => (
                <div key={member.id} className="flex items-center gap-4">
                     <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profileImageUrl} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.fitnessGoal}</p>
                    </div>
                    {member.medicalConditions.length > 0 && <Badge variant="destructive">Alert</Badge>}
                </div>
             ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
