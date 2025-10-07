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
  User,
  Settings,
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppLogo } from '@/components/icons';
import { UserNav } from './user-nav';
import { ThemeToggle } from '../theme-toggle';
import { useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useEffect, useState } from 'react';
import type { User as AppUserType } from '@/lib/types';


export const allNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Admin', 'Member', 'Operator'] },
  { href: '/master-data', icon: Database, label: 'Master Data', roles: ['Admin', 'Member'] },
  { href: '/stock', icon: Warehouse, label: 'Stock', roles: ['Admin', 'Member'] },
  { href: '/program', icon: FileText, label: 'Program', roles: ['Admin', 'Member'] },
  { href: '/ruling', icon: GitBranch, label: 'Reel Ruling', roles: ['Admin', 'Member', 'Operator'] },
  { href: '/reports', icon: BarChart3, label: 'Reports', roles: ['Admin', 'Member'] },
  { href: '/production-overview', icon: PieChart, label: 'Production Overview', roles: ['Admin', 'Member'] },
  { href: '/users', icon: Users, label: 'Users', roles: ['Admin'] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();
  const [userRole, setUserRole] = useState<string | null>(null);
  const { state } = useSidebar();


  useEffect(() => {
    const fetchUserRole = async () => {
      if(user && firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as AppUserType;
          setUserRole(userData.role);
        }
      }
    };
    fetchUserRole();
  }, [user, firestore]);

  const navItems = allNavItems.filter(item => userRole && item.roles.includes(userRole));


  return (
    <Sidebar>
      <SidebarHeader className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AppLogo className="h-8 w-8 text-primary" />
          {state === 'expanded' && <span className="text-xl font-semibold">Navigator</span>}
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
           {state === 'expanded' && <ThemeToggle />}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
