
import type { ReactNode } from "react";
import Image from 'next/image';
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const bgImage = PlaceHolderImages.find(img => img.id === 'login-background');
  const imageUrl = bgImage?.imageUrl || 'https://picsum.photos/seed/login/1920/1080';
  
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={bgImage?.description || 'Gym background'}
            fill
            className="object-cover"
            data-ai-hint={bgImage?.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-20 flex items-center text-lg font-medium font-headline">
           <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          GymFlex
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;The only bad workout is the one that didn&apos;t happen. Step in and make it count.&rdquo;
            </p>
            <footer className="text-sm">GymFlex Motto</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex h-full w-full items-center justify-center p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
