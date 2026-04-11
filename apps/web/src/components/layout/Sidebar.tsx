import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth, useProfile, useI18n } from "@paca/api";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  ClipboardCheck,
  User,
  LogOut,
  Plus,
  Menu,
  X,
  Activity,
} from "lucide-react";
import { useState, useEffect } from "react";
import { isAdminEmail } from "@/lib/admin";

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { t } = useI18n();

  const baseNav = [
    { to: "/", icon: LayoutDashboard, label: t.nav.dashboard },
    { to: "/transactions", icon: ArrowLeftRight, label: t.nav.transactions },
    { to: "/budget", icon: PieChart, label: t.nav.budget },
    { to: "/bills", icon: ClipboardCheck, label: t.nav.bills },
    { to: "/profile", icon: User, label: t.nav.profile },
  ];
  const navItems = isAdminEmail(user?.email)
    ? [...baseNav, { to: "/admin/usage", icon: Activity, label: "Usage" }]
    : baseNav;
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <img
          src="/logo-icon-large.png"
          alt="Paca Finance"
          className="w-9 h-9 rounded-xl blend-multiply dark:invert-0"
        />
        <h1 className="text-lg font-display font-bold text-pink-primary">
          Paca Finance
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-pink-50 dark:bg-pink-primary/10 text-pink-primary"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Add transaction button */}
      <div className="px-3 pb-3">
        <button
          onClick={() => navigate("/transactions/new")}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-pink-primary to-pink-light text-white font-semibold text-sm shadow-lg shadow-pink-primary/25 hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          {t.nav.newTransaction}
        </button>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-primary to-pink-light flex items-center justify-center text-white text-sm font-bold shrink-0">
              {profile?.display_name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {profile?.display_name ?? ""}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-400 hover:text-red-primary rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label={t.auth.logout}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={t.nav.openMenu}
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo-icon-large.png" alt="" className="w-7 h-7 rounded-lg blend-multiply" />
          <span className="text-base font-display font-bold text-pink-primary">Paca</span>
        </div>
        <button
          onClick={() => navigate("/transactions/new")}
          className="p-2 rounded-xl bg-pink-primary/10 text-pink-primary transition-colors"
          aria-label={t.nav.newTransaction}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 flex flex-col shadow-2xl animate-slideInLeft"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t.nav.closeMenu}
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-col z-40">
        {sidebarContent}
      </aside>
    </>
  );
}
