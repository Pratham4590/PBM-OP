'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  Warehouse,
  FileText,
  GitBranch,
  BarChart3,
  Users,
  PieChart,
} from 'lucide-react';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppLogo } from '@/components/icons';
import { UserNav } from './user-nav';
import { ThemeToggle } from '../theme-toggle';

export const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/master-data', icon: Database, label: 'Master Data' },
  { href: '/stock', icon: Warehouse, label: 'Stock' },
  { href: '/program', icon: FileText, label: 'Program' },
  { href: '/ruling', icon: GitBranch, label: 'Reel Ruling' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/production-overview', icon: PieChart, label: 'Production Overview' },
  { href: '/users', icon: Users, label: 'Users' },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AppLogo className="h-8 w-8 text-primary" />
          <span className="text-xl font-semibold">Navigator</span>
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator />
      <SidebarFooter>
        <div className='flex items-center justify-between p-2'>
            <UserNav />
            <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
