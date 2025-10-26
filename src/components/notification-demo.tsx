"use client";

import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/notification-provider";
import { useNotificationToast } from "@/hooks/use-notification-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NotificationDemo() {
  const { addNotification } = useNotifications();
  const { toast } = useNotificationToast();

  const showSuccessNotification = () => {
    // This will show both toast and add to notification bar
    toast({
      title: "Success",
      description: "Member added successfully!",
    });
  };

  const showErrorNotification = () => {
    toast({
      title: "Error",
      description: "Failed to update member details.",
      variant: "destructive",
    });
  };

  const showWarningNotification = () => {
    addNotification({
      title: "Warning",
      message: "Your subscription will expire in 3 days.",
      type: "warning",
    });
  };

  const showInfoNotification = () => {
    addNotification({
      title: "Info",
      message: "System maintenance scheduled for tomorrow at 2 AM.",
      type: "info",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification System Demo</CardTitle>
        <CardDescription>
          Test the Azure-style notification bar. All notifications appear in the bell icon and can be cleared individually or all at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={showSuccessNotification} variant="default">
          Success Notification
        </Button>
        <Button onClick={showErrorNotification} variant="destructive">
          Error Notification
        </Button>
        <Button onClick={showWarningNotification} variant="outline" className="border-yellow-500 text-yellow-600">
          Warning Notification
        </Button>
        <Button onClick={showInfoNotification} variant="secondary">
          Info Notification
        </Button>
      </CardContent>
    </Card>
  );
}
