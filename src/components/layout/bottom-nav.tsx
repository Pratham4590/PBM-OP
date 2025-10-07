'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from './sidebar-nav';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '../theme-toggle';

export function BottomNav() {
  const pathname = usePathname();
  const mainNavItems = navItems.slice(0, 4);
  const moreNavItems = navItems.slice(4);

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {mainNavItems.map((item) => (
          <Link
            href={item.href}
            key={item.href}
            className={cn(
              'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group',
              pathname === item.href
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted group text-muted-foreground"
            >
              <MoreHorizontal className="w-5 h-5 mb-1" />
              <span className="text-xs">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2">
            {moreNavItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
             <div className="flex items-center justify-between p-2">
                <span>Theme</span>
                <ThemeToggle />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
