'use client';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '../ui/sidebar';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

export function UserNav() {
  const { state } = useSidebar();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
      router.push('/');
    }
  };

  const getInitials = (email?: string | null) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  };
  
  const userContent = (
    <>
      <Avatar className="h-8 w-8">
        <AvatarImage
          src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/40/40`}
          alt={user?.email || 'User'}
        />
        <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
      </Avatar>
      <div
        className={`text-left transition-opacity duration-200 ${
          state === 'collapsed' && !isMobile ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="text-sm font-medium">{user?.displayName || user?.email?.split('@')[0]}</div>
        <div className="text-xs text-muted-foreground">
          {user?.email}
        </div>
      </div>
    </>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-12 w-full justify-start gap-2 px-2"
        >
          {isMobile ? (
             <div className="flex items-center gap-3 w-full">{userContent}</div>
          ) : (
            userContent
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
            Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
