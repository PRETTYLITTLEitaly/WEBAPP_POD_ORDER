"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { User as UserIcon, LogOut, Shield, Key, ChevronDown, Users } from "lucide-react";
import { getCurrentUser, setCurrentUser, User } from "@/lib/userStore";
import { logoutAction } from "@/app/admin/login/actions";

export default function Navbar() {
  const pathname = usePathname();
  const [stats, setStats] = useState({ b2bCount: 0, b2cCount: 0 });
  const [issuesCount, setIssuesCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());

    fetch("/api/stats")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .catch(console.error);
      
    fetch("/api/sendcloud/issues")
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.count === 'number') {
          setIssuesCount(data.count);
        }
      })
      .catch(console.error);
  }, [pathname]);

  // Hide Navbar completely on login page
  if (pathname === "/admin/login") {
    return null;
  }

  const handleLogout = async () => {
    setCurrentUser(null);
    await logoutAction();
  };

  const links = [
    { name: "Dashboard", href: "/" },
    { name: "Ordini B2B", href: "/orders/b2b", badge: stats.b2bCount },
    { name: "Ordini B2C", href: "/orders/b2c", badge: stats.b2cCount },
    { name: "Metafield Prodotti", href: "/settings/products" },
    { name: "Report", href: "/report" },
    { name: "Produzione", href: "/produzione" },
    { name: "Spedizioni", href: "/spedizioni", badge: issuesCount, isAlert: true },
    { name: "Impostazioni", href: "/settings" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-[52px]">
          <div className="flex">
            {/* Logo / Brand */}
            <div className="flex-shrink-0 flex items-center pr-6 border-r border-gray-200 mr-2">
              <span className="text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                <div className="w-6 h-6 bg-[#303030] rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                Operational Center
              </span>
            </div>

            {/* Links */}
            <div className="hidden sm:flex space-x-1 items-end">
              {links.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`inline-flex items-center px-3 py-3 border-b-[3px] text-sm font-medium transition-colors ${
                      isActive
                        ? "border-[#303030] text-[#303030]"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t-lg"
                    }`}
                  >
                    {link.name}
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className={`ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        link.isAlert 
                          ? "bg-[#fed3d1] text-[#8e1f1c]" 
                          : "bg-gray-200 text-gray-800"
                      }`}>
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Account Icon Menu (Fixed Top-Right) */}
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                  {user?.email?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-gray-900 leading-tight">
                    {user?.email || "Utente"}
                  </span>
                  <span className="text-[10px] font-medium text-indigo-600 capitalize leading-tight flex items-center gap-0.5">
                    {user?.role === "admin" && <Shield className="w-2.5 h-2.5 text-indigo-600" />}
                    {user?.role || "operatore"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg ring-1 ring-black/5 border border-gray-100 py-1.5 z-[100]"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-500">Connesso come</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.email || "Utente"}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 text-indigo-700">
                      Ruolo: {user?.role || "operatore"}
                    </span>
                  </div>

                  {user?.role === "admin" && (
                    <Link
                      href="/settings/users"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Users className="w-4 h-4 text-indigo-600" />
                      Gestione Utenti
                    </Link>
                  )}

                  <Link
                    href="/settings/account"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Key className="w-4 h-4 text-gray-500" />
                    Cambia Password
                  </Link>

                  <div className="border-t border-gray-100 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Disconnetti (Logout)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
