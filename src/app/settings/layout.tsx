"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Settings, Type, Users, Key } from "lucide-react";
import { getCurrentUser, User } from "@/lib/userStore";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const navItems = [
    {
      name: "Configurazione",
      href: "/settings",
      icon: Settings,
      exact: true
    },
    {
      name: "Libreria Font",
      href: "/settings/fonts",
      icon: Type,
      exact: false
    },
    ...(user?.role === "admin" ? [{
      name: "Gestione Utenti",
      href: "/settings/users",
      icon: Users,
      exact: false
    }] : []),
    {
      name: "Il tuo Account",
      href: "/settings/account",
      icon: Key,
      exact: false
    }
  ];

  return (
    <div className="min-h-[calc(100vh-53px)] bg-[#f4f6f8] flex">
      {/* Sidebar */}
      <div className="w-64 bg-[#f4f6f8] border-r border-gray-200 p-4 shrink-0">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3">
          Impostazioni App
        </h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5 opacity-75" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
