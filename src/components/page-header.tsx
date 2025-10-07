"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarTrigger } from "./ui/sidebar";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  const isMobile = useIsMobile();
  return (
    <div className={cn("flex items-center justify-between space-y-2 mb-6", className)}>
       <div className="flex items-center gap-4">
        {isMobile && <SidebarTrigger />}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-muted-foreground hidden sm:block">{description}</p>}
        </div>
      </div>
      <div className="hidden sm:flex items-center space-x-2">{children}</div>
    </div>
  );
}
