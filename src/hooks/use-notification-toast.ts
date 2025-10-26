import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/lib/notification-provider";

export function useNotificationToast() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();

  const notificationToast = ({
    title,
    description,
    variant,
    ...props
  }: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
    [key: string]: any;
  }) => {
    // Show toast
    toast({ title, description, variant, ...props });

    // Also add to notification bar
    const type = variant === "destructive" ? "error" : "success";
    addNotification({
      title,
      message: description || title || "",
      type,
    });
  };

  return { toast: notificationToast };
}
