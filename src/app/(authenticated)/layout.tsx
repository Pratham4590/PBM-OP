'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BottomNav } from '@/components/layout/bottom-nav';

function AuthenticatedContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  // While loading, show a simple loading state.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If there is a user, show the main authenticated layout.
  if (user) {
    return (
      <SidebarProvider>
        {isMobile ? <BottomNav /> : <SidebarNav />}
        <SidebarInset>
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // If no user and not loading, this will soon redirect, so render nothing.
  return null;
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <AuthenticatedContent>{children}</AuthenticatedContent>
    </FirebaseClientProvider>
  );
}
