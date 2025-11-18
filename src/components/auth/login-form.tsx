"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth-provider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useNotificationToast } from "@/hooks/use-notification-toast";
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  email: z.string().min(1, { message: "Email or username is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user, loading } = useAuth();
  const { toast } = useNotificationToast();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard/overview");
    }
  }, [user, loading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await login(values.email, values.password);
      // The AuthProvider will handle redirection.
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials. Please check your email and password.",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[420px] animate-in fade-in-50 duration-500 py-8">
      {/* Mobile Logo */}
      <div className="flex lg:hidden items-center justify-center mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-4 ring-primary/5 mr-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-primary"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-xl font-bold font-headline">V3 Fitness</span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col space-y-3 text-center">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/5 backdrop-blur-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-primary"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight font-headline bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Welcome Back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your V3 Fitness account to continue
        </p>
      </div>

      {/* Form Card */}
      <Card className="border-muted/50 shadow-xl">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email or Username</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          placeholder="you@example.com or username"
                          {...field}
                          autoComplete="username"
                          className="pl-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          autoComplete="current-password"
                          className="pl-10 pr-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Forgot Password Link */}
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded px-1"
                  onClick={() => {
                    toast({
                      title: "Password Reset",
                      description: "Please contact your administrator to reset your password.",
                    });
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all group focus:ring-2 focus:ring-primary/20 focus:ring-offset-2" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        🔒 Secure login powered by Firebase Authentication
      </p>
    </div>
  );
}