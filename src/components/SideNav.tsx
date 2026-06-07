"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, ClipboardList, BarChart3, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "대시보드", href: "/", icon: Home },
  { name: "캘린더", href: "/calendar", icon: Calendar },
  { name: "이용현황", href: "/usage", icon: ClipboardList },
  { name: "통계", href: "/analytics", icon: BarChart3 },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-300">
      <div className="flex items-center justify-center md:justify-start h-16 px-0 md:px-6 border-b border-slate-100">
        <div className="flex items-center gap-3 text-indigo-600">
          <Building2 className="w-8 h-8" />
          <span className="font-bold text-xl hidden md:block text-slate-900 tracking-tight">머무룸 DX</span>
        </div>
      </div>

      <div className="flex-1 py-6 px-3 flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center md:justify-start gap-4 px-3 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-indigo-50 text-indigo-700" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon 
                className={cn(
                  "w-6 h-6 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                )} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className={cn(
                "font-medium hidden md:block text-sm",
                isActive ? "font-semibold" : ""
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
