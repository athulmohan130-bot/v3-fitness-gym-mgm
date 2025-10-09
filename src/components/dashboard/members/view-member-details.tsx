import type { GymUser, MembershipPlan } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInDays, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ViewMemberDetailsProps {
  member: GymUser;
  plan?: MembershipPlan;
}

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-base font-semibold">{value || "N/A"}</p>
  </div>
);

export function ViewMemberDetails({ member, plan }: ViewMemberDetailsProps) {
  const membershipStartDate = parseISO(member.membershipStart);
  const membershipEndDate = parseISO(member.membershipEnd);
  const totalDuration = differenceInDays(
    membershipEndDate,
    membershipStartDate
  );
  const daysCompleted = differenceInDays(new Date(), membershipStartDate);
  const progress = Math.min(
    Math.max((daysCompleted / totalDuration) * 100, 0),
    100
  );

  const getStatusClasses = (status: string) => {
    const statusMap: { [key: string]: string } = {
      active: "bg-green-500/20 text-green-700 border-green-500/30",
      expired: "bg-red-500/20 text-red-700 border-red-500/30",
      pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
    };
    return statusMap[status] || "bg-secondary text-secondary-foreground";
  };

  const bmiValue = parseFloat(member.bmi as any);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem label="Full Name" value={member.name} />
            <DetailItem label="Email Address" value={member.email} />
            <DetailItem label="Phone Number" value={member.phone} />
            <DetailItem
              label="Date of Birth"
              value={format(parseISO(member.dateOfBirth), "PPP")}
            />
            <DetailItem label="Gender" value={member.gender} />
            <DetailItem label="Age" value={`${member.age} years`} />
            <div className="md:col-span-2">
              <DetailItem label="Address" value={member.address} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health & Fitness</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem label="Height" value={`${member.heightCm} cm`} />
            <DetailItem label="Weight" value={`${member.weightKg} kg`} />
            <DetailItem
              label="BMI"
              value={!isNaN(bmiValue) ? bmiValue.toFixed(1) : "N/A"}
            />
            <DetailItem
              label="Primary Fitness Goal"
              value={member.fitnessGoal}
            />
            <div className="md:col-span-2">
              <DetailItem
                label="Medical Conditions"
                value={member.medicalConditions.join(", ") || "None"}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem
              label="Contact Name"
              value={member.emergencyContact.name}
            />
            <DetailItem
              label="Contact Phone"
              value={member.emergencyContact.phone}
            />
            <DetailItem
              label="Relationship"
              value={member.emergencyContact.relation}
            />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-8">
        <Card>
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={member.profileImageUrl} alt={member.name} />
              <AvatarFallback>
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <CardTitle>{member.name}</CardTitle>
            <CardDescription>{member.email}</CardDescription>
          </CardHeader>
          {/* <CardContent className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium">Membership Status</p>
                            <Badge className={getStatusClasses(member.membershipStatus)}>{member.membershipStatus}</Badge>
                        </div>
                        <DetailItem label="Plan" value={plan?.name || 'N/A'} />
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-2 text-muted-foreground">Membership Period</p>
                        <Progress value={progress} className="h-2"/>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>{format(membershipStartDate, 'do MMM yyyy')}</span>
                            <span>{format(membershipEndDate, 'do MMM yyyy')}</span>
                        </div>
                    </div>
                    <DetailItem label="Join Date" value={format(parseISO(member.joinDate), 'PPP')} />
                    <DetailItem label="Renewal Date" value={format(parseISO(member.renewalDate), 'PPP')} />
                </CardContent> */}
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium">Membership Status</p>
                <Badge className={getStatusClasses(member.membershipStatus)}>
                  {member.membershipStatus}
                </Badge>
              </div>

              <DetailItem label="Plan" value={plan?.name || "N/A"} />
              {/* ✅ Added */}
            </div>
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">
                Membership Period
              </p>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{format(membershipStartDate, "do MMM yyyy")}</span>
                <span>{format(membershipEndDate, "do MMM yyyy")}</span>
              </div>
            </div>
            <DetailItem
              label="Join Date"
              value={format(parseISO(member.joinDate), "PPP")}
            />
            <DetailItem
              label="Renewal Date"
              value={format(parseISO(member.renewalDate), "PPP")}
            />
            <DetailItem
              label="Biometric Device ID"
              value={member.biometricDeviceId || "N/A"}
            />
            <div className="flex justify-between gap-2">
              <p className="text-sm font-medium">Payment Status</p>
              <Badge
                className={
                  member.paymentStatus === "paid"
                    ? "bg-green-500/20 text-green-700 border-green-500/30"
                    : member.paymentStatus === "pending"
                    ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
                    : "bg-red-500/20 text-red-700 border-red-500/30"
                }
              >
                {member.paymentStatus || "N/A"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
