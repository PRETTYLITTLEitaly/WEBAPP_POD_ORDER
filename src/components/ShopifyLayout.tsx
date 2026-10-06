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
  Mail,
  LogOut, 
  Store,
  Bug,
  ChevronDown,
  User as UserIcon,
  Layers,
  MessageSquare,
  Ticket as TicketIcon,
  Sparkles,
  Sliders,
  RefreshCw
} from "lucide-react";
import { getCurrentUser, setCurrentUser, User } from "@/lib/userStore";
import { logoutAction } from "@/app/admin/login/actions";

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [stats, setStats] = useState({ b2bCount: 0, b2cCount: 0 });
  const [issuesCount, setIssuesCount] = useState(0);
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const fetchNotificationsData = () => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .catch(console.error);

    fetch("/api/sendcloud/issues")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.count === "number") {
          setIssuesCount(data.count);
        }
      })
      .catch(console.error);

    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.emailMessages)) {
          const unread = data.emailMessages.filter((m: any) => !m.isRead && m.direction === "INBOUND").length;
          setUnreadEmailsCount(unread);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    setUser(getCurrentUser());
    fetchNotificationsData();

    const interval = setInterval(fetchNotificationsData, 20000);
    return () => clearInterval(interval);
  }, [pathname]);

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
        { name: "Sync B2C-B2B", href: "/sync", icon: RefreshCw },
        { name: "Ordini B2B", href: "/orders/b2b", icon: ShoppingCart, badge: stats.b2bCount },
        { name: "Ordini B2C", href: "/orders/b2c", icon: ShoppingCart, badge: stats.b2cCount },
        { name: "Messaggi & Chat", href: "/messages", icon: MessageSquare, badge: unreadEmailsCount, isAlert: unreadEmailsCount > 0 },
        { name: "Ticket Assistenza", href: "/tickets", icon: TicketIcon },
        { name: "Metafield Prodotti", href: "/settings/products", icon: Package },
        { name: "Produzione DTF", href: "/produzione", icon: Printer },
        { name: "Spedizioni", href: "/spedizioni", icon: Truck, badge: issuesCount, isAlert: true },
        { name: "Analisi & Report", href: "/report", icon: BarChart3 },
      ],
    },
    {
      title: "Impostazioni App",
      items: [
        { name: "Impostazioni Bobina", href: "/settings", icon: Settings },
        { name: "Impostazione Grafica", href: "/settings/grafica", icon: Sliders },
        { name: "Libreria Font", href: "/settings/fonts", icon: Type },
        { name: "BUG FIX", href: "/bug-fix", icon: Bug },
        { name: "Gestione Utenti", href: "/settings/users", icon: Users },
        { name: "Account Utente", href: "/settings/account", icon: UserIcon },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f2f4] text-gray-900 font-sans">
      {/* 1. TOP BAR SHOPIFY DARK (#1a1a1a) */}
      <header className="h-14 bg-[#1a1a1a] text-white flex items-center justify-between px-4 z-40 shrink-0 border-b border-gray-800">
        {/* Brand & Logo Shopify */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center font-black text-white text-lg shadow-sm">
              P
            </div>
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              Shopify <span className="text-[10px] bg-red-950/80 text-red-300 px-1.5 py-0.5 rounded font-mono border border-red-800/50">POD App</span>
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

        {/* NOTIFICHE E PROFILO IN ALTO A DESTRA */}
        <div className="flex items-center gap-3">
          {/* Icona Mail per Email non lette */}
          <Link
            href="/messages"
            className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center"
            title={`Posta Assistenza: ${unreadEmailsCount} email non lette`}
          >
            <Mail className="w-4.5 h-4.5 text-indigo-400" />
            {unreadEmailsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-gray-900 shadow-sm animate-pulse">
                {unreadEmailsCount}
              </span>
            )}
          </Link>

          {/* Campanello Centro Notifiche */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Centro Notifiche"
            >
              <Bell className="w-4.5 h-4.5" />
              {(issuesCount > 0 || unreadEmailsCount > 0) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-2 text-gray-800 text-xs z-50 animate-in fade-in duration-100">
                <div className="px-4 py-2 border-b border-gray-100 font-bold text-gray-900 flex items-center justify-between">
                  <span>Centro Notifiche</span>
                  <span className="text-[10px] text-gray-400 font-normal">In tempo reale</span>
                </div>

                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {unreadEmailsCount > 0 && (
                    <Link
                      href="/messages"
                      onClick={() => setNotificationsOpen(false)}
                      className="p-3 hover:bg-indigo-50/60 flex items-start gap-2.5 transition-all group"
                    >
                      <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-indigo-600">Nuove Email Assistenza</div>
                        <div className="text-[11px] text-gray-600">Hai {unreadEmailsCount} email non lette in cassa.</div>
                      </div>
                    </Link>
                  )}

                  {issuesCount > 0 && (
                    <Link
                      href="/spedizioni"
                      onClick={() => setNotificationsOpen(false)}
                      className="p-3 hover:bg-red-50/60 flex items-start gap-2.5 transition-all group"
                    >
                      <div className="p-1.5 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-red-600">Anomalie Spedizioni</div>
                        <div className="text-[11px] text-gray-600">{issuesCount} spedizioni richiedono attenzione.</div>
                      </div>
                    </Link>
                  )}

                  {unreadEmailsCount === 0 && issuesCount === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400">Nessuna nuova notifica.</div>
                  )}
                </div>
              </div>
            )}
          </div>

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
                  // Evitiamo che /settings venga evidenziata quando la rotte è /settings/products
                  const isActive = item.href === "/settings" 
                    ? pathname === "/settings" 
                    : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

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

        {/* 3. AREA DI CONTENUTO PRINCIPALE CON PADDING POLARIS SHOPIFY */}
        <main className="flex-1 overflow-y-auto bg-[#f1f2f4] p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>

      </div>

    </div>
  );
}
