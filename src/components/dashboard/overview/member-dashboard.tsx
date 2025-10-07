import type { GymUser } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dumbbell, Calendar, HeartPulse, Target, ShieldAlert } from "lucide-react"
import { differenceInDays, format, parseISO } from 'date-fns';
import Link from "next/link";

interface MemberDashboardProps {
  user: GymUser;
}

export function MemberDashboard({ user }: MemberDashboardProps) {
  const membershipStartDate = parseISO(user.membershipStart);
  const membershipEndDate = parseISO(user.membershipEnd);
  const totalDuration = differenceInDays(membershipEndDate, membershipStartDate);
  const daysCompleted = differenceInDays(new Date(), membershipStartDate);
  const progress = Math.min(Math.max((daysCompleted / totalDuration) * 100, 0), 100);
  const daysRemaining = differenceInDays(membershipEndDate, new Date());

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { category: "Underweight", color: "bg-blue-500" };
    if (bmi < 25) return { category: "Normal", color: "bg-green-500" };
    if (bmi < 30) return { category: "Overweight", color: "bg-yellow-500" };
    return { category: "Obese", color: "bg-red-500" };
  };

  const bmiInfo = getBmiCategory(user.bmi);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>My Membership</CardTitle>
          <CardDescription>
            Your current plan is <span className="font-semibold text-primary">{user.membershipPlanId.split('_').join(' ')}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Membership Progress</p>
                <Badge variant={user.membershipStatus === 'active' ? 'default' : 'destructive'} className={user.membershipStatus === 'active' ? 'bg-green-500/20 text-green-700' : ''}>
                    {user.membershipStatus.charAt(0).toUpperCase() + user.membershipStatus.slice(1)}
                </Badge>
            </div>
            <Progress value={progress} aria-label={`${progress}% of membership used`} />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>Started: {format(membershipStartDate, 'do MMM, yyyy')}</span>
                <span>Expires: {format(membershipEndDate, 'do MMM, yyyy')} ({daysRemaining} days left)</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
            <Button asChild>
                <Link href="/dashboard/billing">Renew Membership</Link>
            </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <HeartPulse className="w-6 h-6 text-primary"/>
                    <span className="font-medium">BMI</span>
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold">{user.bmi.toFixed(1)}</p>
                    <p className={`text-xs font-semibold ${bmiInfo.color.replace('bg-', 'text-')}`}>{bmiInfo.category}</p>
                </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <Dumbbell className="w-6 h-6 text-accent"/>
                    <span className="font-medium">Weight</span>
                </div>
                <p className="text-xl font-bold">{user.weightKg} kg</p>
            </div>
        </CardContent>
      </Card>
      
       <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>My Journey</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-4 p-4 rounded-lg border">
                <Target className="w-8 h-8 text-primary mt-1" />
                <div>
                    <h3 className="font-semibold">Fitness Goal</h3>
                    <p className="text-sm text-muted-foreground">{user.fitnessGoal}</p>
                </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg border">
                <ShieldAlert className="w-8 h-8 text-destructive mt-1" />
                <div>
                    <h3 className="font-semibold">Medical Notes</h3>
                    <p className="text-sm text-muted-foreground">
                        {user.medicalConditions.join(', ') || 'None'}
                    </p>
                </div>
            </div>
             <div className="flex items-start gap-4 p-4 rounded-lg border">
                <Calendar className="w-8 h-8 text-accent mt-1" />
                <div>
                    <h3 className="font-semibold">Last Check-in</h3>
                    <p className="text-sm text-muted-foreground">{format(new Date(), 'do MMMM yyyy, p')}</p>
                </div>
            </div>
          </CardContent>
        </Card>

    </div>
  )
}
