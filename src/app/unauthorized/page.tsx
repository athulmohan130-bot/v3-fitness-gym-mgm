import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
      <h1 className="text-4xl font-bold font-headline text-destructive">Access Denied</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        You do not have permission to view this page.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Please contact an administrator if you believe this is an error.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard/overview">
          Return to Dashboard
        </Link>
      </Button>
    </div>
  );
}
