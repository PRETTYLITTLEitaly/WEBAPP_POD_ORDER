"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Printer, 
  Truck, 
  BarChart3, 
  Settings, 
  Type, 
  Users, 
  Search, 
  Bell, 
  LogOut, 
  Store,
  ChevronDown,
  User as UserIcon,
  Layers,
  Sparkles
} from "lucide-react";
import { getCurrentUser, setCurrentUser, User } from "@/lib/userStore";
import { logoutAction } from "@/app/admin/login/actions";

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [stats, setStats] = useState({ b2bCount: 0, b2cCount: 0 });
  const [issuesCount, setIssuesCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

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

  // Se siamo nella pagina di login, renderizziamo solo il contenuto senza layout Shopify
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    setCurrentUser(null);
    await logoutAction();
  };

  const navGroups = [
    {
      title: "Menu Principale",
      items: [
        { name: "Home", href: "/", icon: Home },
        { name: "Ordini B2B", href: "/orders/b2b", icon: ShoppingCart, badge: stats.b2bCount },
        { name: "Ordini B2C", href: "/orders/b2c", icon: ShoppingCart, badge: stats.b2cCount },
        { name: "Metafield Prodotti", href: "/settings/products", icon: Package },
        { name: "Produzione DTF", href: "/produzione", icon: Printer },
        { name: "Spedizioni", href: "/spedizioni", icon: Truck, badge: issuesCount, isAlert: true },
        { name: "Analisi & Report", href: "/report", icon: BarChart3 },
      ]
    },
    {
      title: "Configurazione",
      items: [
        { name: "Impostazioni Bobina", href: "/settings", icon: Settings },
        { name: "Libreria Font", href: "/settings/fonts", icon: Type },
        { name: "Utenti & Accessi", href: "/settings/users", icon: Users },
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f2f4] text-gray-900 font-sans">
      
      {/* 1. TOP BAR SHOPIFY DARK (#1a1a1a) */}
      <header className="h-14 bg-[#1a1a1a] text-white flex items-center justify-between px-4 z-40 shrink-0 border-b border-gray-800">
        
        {/* Brand & Logo Shopify */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-black text-lg shadow-sm">
              S
            </div>
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              Shopify <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-mono">POD App</span>
            </span>
          </Link>
        </div>

        {/* BARRA DI RICERCA GLOBALE CENTRALE STILE SHOPIFY */}
        <div className="flex-1 max-w-xl mx-4">
          <div 
            onClick={() => setSearchModalOpen(true)}
            className="relative bg-[#2c2c2c] hover:bg-[#363636] border border-gray-700 rounded-lg px-3 py-1.5 flex items-center justify-between text-gray-400 text-xs cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
              <span>Cerca ordini, prodotti o impostazioni...</span>
            </div>
            <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[10px] font-mono border border-gray-700">⌘K</kbd>
          </div>
        </div>

        {/* NOTIFICHE E PROFILO IN ALTO A DESTRA STILE SHOPIFY */}
        <div className="flex items-center gap-3">
          
          {/* Campanello Notifiche */}
          <button 
            className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Notifiche"
          >
            <Bell className="w-4 h-4" />
            {issuesCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            )}
          </button>

          {/* Profilo Utente / Store */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 bg-[#2c2c2c] hover:bg-[#363636] px-2.5 py-1 rounded-lg border border-gray-700 text-xs font-semibold text-white transition-all"
            >
              <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                {user?.email ? user.email.charAt(0).toUpperCase() : "A"}
              </div>
              <span className="max-w-[120px] truncate">{user?.email || "PRETTYLITTLE ITALY"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1 text-gray-800 text-xs z-50 animate-in fade-in duration-100">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <div className="font-bold text-gray-900 truncate">{user?.email || "Admin"}</div>
                  <div className="text-[10px] text-indigo-600 font-semibold uppercase mt-0.5">
                    Ruolo: {user?.role || "Admin"}
                  </div>
                </div>

                <Link
                  href="/settings/account"
                  onClick={() => setUserDropdownOpen(false)}
                  className="px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 font-medium"
                >
                  <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                  Account Utente
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium border-t border-gray-100"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  Disconnetti (Logout)
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* 2. BODY CON SIDEBAR DI SINISTRA E CONTENUTO PRINCIPALE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR DI SINISTRA STILE SHOPIFY (#f6f6f7) */}
        <aside className="w-60 bg-[#f6f6f7] border-r border-gray-200 flex flex-col justify-between shrink-0 select-none py-4 px-3 space-y-6">
          
          <div className="space-y-6">
            {navGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {group.title}
                </div>

                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-white text-indigo-700 shadow-sm border border-gray-200/80 font-bold"
                          : "text-gray-700 hover:bg-gray-200/60 hover:text-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-gray-500"}`} />
                        <span>{item.name}</span>
                      </div>

                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.isAlert ? "bg-red-500 text-white" : "bg-gray-200 text-gray-800"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Banner Informazioni Store In Basso */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 text-xs space-y-1 shadow-sm">
            <div className="font-bold text-gray-900 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-indigo-600" />
              Prettylittleitaly
            </div>
            <p className="text-[11px] text-gray-500">Stampa DTF & Pod Center</p>
          </div>

        </aside>

        {/* 3. AREA DI CONTENUTO PRINCIPALE */}
        <main className="flex-1 overflow-y-auto bg-[#f1f2f4]">
          {children}
        </main>

      </div>

    </div>
  );
}
