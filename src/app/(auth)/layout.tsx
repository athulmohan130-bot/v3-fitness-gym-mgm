import type { ReactNode } from "react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { NotificationProvider } from "@/lib/notification-provider";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const bgImage = PlaceHolderImages.find(
    (img) => img.id === "login-background"
  );
  const imageUrl =
    bgImage?.imageUrl || "https://picsum.photos/seed/login/1920/1080";

  return (
    <NotificationProvider>
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center lg:grid lg:grid-cols-2 bg-gradient-to-br from-primary/5 via-background to-primary/5 lg:bg-gradient-to-br lg:from-background lg:via-background lg:to-muted/20">
        {/* Left Side - Image & Branding */}
        <div className="relative hidden h-full flex-col bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-10 text-white lg:flex overflow-hidden">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={bgImage?.description || "Gym background"}
              fill
              className="object-cover mix-blend-overlay opacity-30"
              data-ai-hint={bgImage?.imageHint}
            />
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-transparent" />
          
          {/* Decorative Elements */}
          <div className="absolute top-10 right-10 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          
          {/* Logo */}
          <div className="relative z-20 flex items-center text-lg font-medium font-headline">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm mr-3 ring-2 ring-white/30 shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-bold">V3 Fitness</span>
          </div>
          
          {/* Content */}
          <div className="relative z-20 mt-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold font-headline leading-tight">
                Transform Your<br />Fitness Journey
              </h2>
              <p className="text-lg text-white/90 max-w-md leading-relaxed">
                Modern gym management made simple. Track members, manage plans, and grow your fitness business.
              </p>
            </div>
            
            <blockquote className="space-y-3 border-l-4 border-white/40 pl-5 bg-white/5 py-4 rounded-r-lg">
              <p className="text-lg italic text-white/95 leading-relaxed">
                &ldquo;The only bad workout is the one that didn&apos;t happen. Step in and make it count.&rdquo;
              </p>
              <footer className="text-sm text-white/70 font-medium">— V3 Fitness Motto</footer>
            </blockquote>
            
            {/* Stats */}
            <div className="flex gap-8 pt-6 border-t border-white/10">
              <div>
                <div className="text-3xl font-bold">100+</div>
                <div className="text-sm text-white/60">Active Gyms</div>
              </div>
              <div>
                <div className="text-3xl font-bold">5K+</div>
                <div className="text-sm text-white/60">Members</div>
              </div>
              <div>
                <div className="text-3xl font-bold">99%</div>
                <div className="text-sm text-white/60">Uptime</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - Login Form */}
        <div className="flex h-full w-full items-center justify-center p-6 lg:p-8">
          {children}
        </div>
      </div>
    </NotificationProvider>
  );
}
