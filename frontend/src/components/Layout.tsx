import { Outlet, Link, useLocation } from "react-router-dom";
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileBarChart,
  Settings,
  Menu,
  X,
  ChevronDown,
  Tags,
  Building2,
  UserCog,
  ClipboardList,
  ArrowLeftRight,
  PlusCircle,
  History,
  Layers,
  Sliders,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  ChevronRight,
} from "./icons";
import { useState, useEffect, useMemo, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore, useCartStore } from "../stores";
import { useSidebarStore } from "../stores/sidebarStore";
import { api } from "../services/api";
import { cn, setCurrency, setFavicon } from "../lib/utils";
import { useT, setAppLanguage } from "../i18n";
import BranchDropdown from "./BranchDropdown";
import UserMenu from "./UserMenu";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";

import type { LucideIcon } from "./icons";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permissions: string[];
}

function useNavItems(t: (key: string) => string): NavItem[] {
  return [
    {
      to: "/dashboard",
      label: t("nav.dashboard"),
      icon: LayoutDashboard,
      permissions: [PERMISSIONS.DASHBOARD_VIEW],
    },
    {
      to: "/pos",
      label: t("nav.pos"),
      icon: ShoppingCart,
      permissions: [PERMISSIONS.POS_ACCESS],
    },
    {
      to: "/pos/history",
      label: t("nav.transactionHistory"),
      icon: History,
      permissions: [PERMISSIONS.POS_HISTORY],
    },
    {
      to: "/products",
      label: t("nav.products"),
      icon: Package,
      permissions: [PERMISSIONS.PRODUCTS_VIEW],
    },
    {
      to: "/categories",
      label: t("nav.categories"),
      icon: Layers,
      permissions: [PERMISSIONS.CATEGORIES_VIEW],
    },
    {
      to: "/customers",
      label: t("nav.customers"),
      icon: Users,
      permissions: [PERMISSIONS.CUSTOMERS_VIEW],
    },
    {
      to: "/suppliers",
      label: t("nav.suppliers"),
      icon: Truck,
      permissions: [PERMISSIONS.SUPPLIERS_VIEW],
    },
    {
      to: "/stock",
      label: t("nav.stock"),
      icon: ClipboardList,
      permissions: [PERMISSIONS.STOCK_VIEW],
    },
    {
      to: "/purchase-orders",
      label: t("nav.purchaseOrders"),
      icon: PlusCircle,
      permissions: [PERMISSIONS.PURCHASE_ORDERS_VIEW],
    },
    {
      to: "/reports",
      label: t("nav.reports"),
      icon: FileBarChart,
      permissions: [PERMISSIONS.REPORTS_VIEW],
    },
    {
      to: "/settings",
      label: t("nav.settings"),
      icon: Settings,
      permissions: [PERMISSIONS.SETTINGS_ACCESS],
    },
  ];
}

function useSettingsSubItems(t: (key: string) => string): NavItem[] {
  return [
    {
      to: "/settings",
      label: t("nav.generalSettings"),
      icon: Sliders,
      permissions: [PERMISSIONS.SETTINGS_COMPANY],
    },
    {
      to: "/settings/users",
      label: t("nav.userManagement"),
      icon: UserCog,
      permissions: [PERMISSIONS.SETTINGS_USERS],
    },
    {
      to: "/settings/branches",
      label: t("nav.branches"),
      icon: Building2,
      permissions: [PERMISSIONS.SETTINGS_BRANCHES],
    },
    {
      to: "/settings/promotions",
      label: t("nav.promotions"),
      icon: Tags,
      permissions: [PERMISSIONS.SETTINGS_PROMOTIONS],
    },
    {
      to: "/settings/roles",
      label: t("nav.roleManagement"),
      icon: Shield,
      permissions: [PERMISSIONS.SETTINGS_ROLES],
    },
  ];
}

function useStockSubItems(t: (key: string) => string): NavItem[] {
  return [
    {
      to: "/stock/mutations",
      label: t("nav.stockMutations"),
      icon: ArrowLeftRight,
      permissions: [PERMISSIONS.STOCK_MUTATIONS],
    },
    {
      to: "/stock/adjustments",
      label: t("nav.stockAdjustments"),
      icon: PlusCircle,
      permissions: [PERMISSIONS.STOCK_ADJUSTMENTS],
    },
  ];
}

function isActiveSub(pathname: string, to: string): boolean {
  if (to === "/settings") return pathname === "/settings";
  if (to === "/stock/mutations") return pathname === "/stock/mutations";
  if (to === "/stock/adjustments") return pathname === "/stock/adjustments";
  return pathname === to;
}

/* --------------------------------------------------
   Tooltip for collapsed sidebar items
   -------------------------------------------------- */
function SidebarTooltip({
  label,
  children,
  show,
}: {
  label: string;
  children: React.ReactNode;
  show: boolean;
}) {
  if (!show) return <>{children}</>;
  return (
    <div className="sidebar-tooltip-wrapper">
      {children}
      <div className="sidebar-tooltip">{label}</div>
    </div>
  );
}

/* --------------------------------------------------
   Breadcrumb
   -------------------------------------------------- */
function Breadcrumb() {
  const location = useLocation();
  const t = useT();

  const crumbs = useMemo(() => {
    const pathMap: Record<string, { label: string; to?: string }> = {
      "/dashboard": { label: t("nav.dashboard") },
      "/pos": { label: t("nav.pos") },
      "/pos/history": { label: t("nav.transactionHistory") },
      "/products": { label: t("nav.products") },
      "/categories": { label: t("nav.categories") },
      "/customers": { label: t("nav.customers") },
      "/suppliers": { label: t("nav.suppliers") },
      "/stock": { label: t("nav.stock") },
      "/stock/mutations": { label: t("nav.stockMutations") },
      "/stock/adjustments": { label: t("nav.stockAdjustments") },
      "/purchase-orders": { label: t("nav.purchaseOrders") },
      "/reports": { label: t("nav.reports") },
      "/settings": { label: t("nav.settings") },
      "/settings/users": { label: t("nav.userManagement") },
      "/settings/roles": { label: t("nav.roleManagement") },
      "/settings/branches": { label: t("nav.branches") },
      "/settings/promotions": { label: t("nav.promotions") },
      "/profile": { label: t("userMenu.profile") },
    };

    const path = location.pathname;
    const result: { label: string; to?: string }[] = [];

    // For nested routes, add parent first
    if (path.startsWith("/settings/") && path !== "/settings") {
      result.push({ label: t("nav.settings"), to: "/settings" });
    } else if (path.startsWith("/stock/") && path !== "/stock") {
      result.push({ label: t("nav.stock"), to: "/stock" });
    } else if (path === "/pos/history") {
      result.push({ label: t("nav.pos"), to: "/pos" });
    }

    const matched = pathMap[path];
    if (matched) {
      result.push({ label: matched.label });
    } else {
      // Fallback: humanize last segment
      const segments = path.split("/").filter(Boolean);
      const last = segments[segments.length - 1] || "";
      result.push({
        label: last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      });
    }

    return result;
  }, [location.pathname, t]);

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link to="/dashboard" className="breadcrumb-home" aria-label="Home">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="breadcrumb-item">
          <ChevronRight className="breadcrumb-sep" />
          {crumb.to && i < crumbs.length - 1 ? (
            <Link to={crumb.to} className="breadcrumb-link">
              {crumb.label}
            </Link>
          ) : (
            <span className="breadcrumb-current">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* --------------------------------------------------
   Nav section labels (visible in expanded, divider in collapsed)
   -------------------------------------------------- */
const SECTION_MAP: Record<string, string> = {
  "/dashboard": "sectionOperational",
  "/products": "sectionCatalog",
  "/customers": "sectionRelations",
  "/stock": "sectionInventory",
  "/reports": "sectionReports",
  "/settings": "sectionSystem",
};

/* --------------------------------------------------
   Main Layout
   -------------------------------------------------- */
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed, toggle: toggleCollapsed } = useSidebarStore();
  const { selectedBranchId, setTenant, tenant } = useAuthStore();
  const { hasAccess } = usePermissions();
  const clearCart = useCartStore((s) => s.clearCart);
  const queryClient = useQueryClient();
  const location = useLocation();
  const t = useT();

  const [settingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith("/settings"),
  );
  const [stockOpen, setStockOpen] = useState(
    location.pathname.startsWith("/stock"),
  );

  const navItems = useNavItems(t);
  const settingsSubItems = useSettingsSubItems(t);
  const stockSubItems = useStockSubItems(t);

  useEffect(() => {
    setSettingsOpen(location.pathname.startsWith("/settings"));
    setStockOpen(location.pathname.startsWith("/stock"));
  }, [location.pathname]);

  useEffect(() => {
    queryClient.invalidateQueries();
    clearCart();
  }, [selectedBranchId]);

  const { data: profileData } = useQuery({
    queryKey: ["settings-profile"],
    queryFn: () => api.get<any>("/settings/profile"),
    staleTime: 60000,
  });

  useEffect(() => {
    if (profileData?.data) {
      const p = profileData.data;
      const tenantData = p.tenant;
      document.title = tenantData.name || "POS System";
      setFavicon(tenantData.favicon);
      setCurrency(
        tenantData.currency,
        tenantData.language === "id" ? "id-ID" : "en-US",
      );
      setTenant({
        name: tenantData.name,
        logo: tenantData.logo,
        favicon: tenantData.favicon,
        currency: tenantData.currency,
        currency_symbol: tenantData.currency_symbol,
        timezone: tenantData.timezone,
        language: tenantData.language,
        date_format: tenantData.date_format,
      });
      if (tenantData.language === "id" || tenantData.language === "en") {
        setAppLanguage(tenantData.language);
      }
    }
  }, [profileData, setTenant]);

  return (
    <div className="flex h-screen" style={{ background: "var(--bg)" }}>
      {/* ==================== SIDEBAR ==================== */}
      <aside
        id="main-sidebar"
        className={cn(
          "sidebar fixed inset-y-0 left-0 z-50 lg:static lg:inset-auto flex flex-col border-r transition-all duration-300 ease-in-out",
          collapsed ? "sidebar--collapsed" : "sidebar--expanded",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{
          background: "var(--bg-sidebar)",
          borderColor: "var(--border)",
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand header */}
        <div
          className="shrink-0 border-b relative"
          style={{ borderColor: "var(--border)", height: "3.5rem" }}
        >
          <Link to="/dashboard" className="h-full flex items-center">
            {collapsed ? (
              <div className="flex items-center justify-center w-16">
                {tenant?.logo ? (
                  <img
                    src={tenant.logo}
                    alt=""
                    className="w-7 h-7 rounded object-contain"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {tenant?.name?.charAt(0)?.toUpperCase() || "P"}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full px-3">
                <BranchDropdown />
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden shrink-0 absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-(--bg-hover)"
            aria-label="Close navigation menu"
          >
            <X
              className="w-5 h-5"
              style={{ color: "var(--text-secondary)" }}
              aria-hidden
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => {
            if (!hasAccess(item.permissions)) return null;

            const sectionKey = SECTION_MAP[item.to];
            const sectionLabel = sectionKey
              ? t(`nav.${sectionKey}`)
              : undefined;
            const isDropdown = item.to === "/settings" || item.to === "/stock";

            let itemNode: React.ReactNode;

            if (isDropdown) {
              const subItems =
                item.to === "/settings" ? settingsSubItems : stockSubItems;
              const isOpen = item.to === "/settings" ? settingsOpen : stockOpen;
              const toggleFn =
                item.to === "/settings"
                  ? () => setSettingsOpen(!settingsOpen)
                  : () => setStockOpen(!stockOpen);
              const isActive = location.pathname.startsWith(item.to);

              if (collapsed) {
                itemNode = (
                  <SidebarTooltip label={item.label} show={collapsed}>
                    <Link
                      to={subItems[0]?.to || item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "sidebar-nav-item sidebar-nav-item--icon-only",
                        isActive && "sidebar-nav-item--active",
                      )}
                      style={{
                        background: isActive
                          ? "var(--accent-light)"
                          : "transparent",
                        color: isActive
                          ? "var(--accent)"
                          : "var(--text-secondary)",
                      }}
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                    </Link>
                  </SidebarTooltip>
                );
              } else {
                itemNode = (
                  <div>
                    <button
                      onClick={() => toggleFn()}
                      className={cn(
                        "sidebar-nav-item",
                        isActive && "sidebar-nav-item--active",
                      )}
                      style={{
                        background: isActive
                          ? "var(--accent-light)"
                          : "transparent",
                        color: isActive
                          ? "var(--accent)"
                          : "var(--text-secondary)",
                      }}
                    >
                      <item.icon className="w-[18px] h-[18px] shrink-0" />
                      <span className="sidebar-nav-label">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 transition-transform shrink-0",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div
                        className="ml-4 mt-0.5 pl-3 border-l space-y-0.5"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {subItems.map((sub) => {
                          if (!hasAccess(sub.permissions)) return null;
                          return (
                            <Link
                              key={sub.to}
                              to={sub.to}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "sidebar-nav-item",
                                isActiveSub(location.pathname, sub.to) &&
                                  "sidebar-nav-item--active",
                              )}
                              style={{
                                background: isActiveSub(
                                  location.pathname,
                                  sub.to,
                                )
                                  ? "var(--accent-light)"
                                  : "transparent",
                                color: isActiveSub(location.pathname, sub.to)
                                  ? "var(--accent)"
                                  : "var(--text-muted)",
                              }}
                            >
                              <sub.icon className="w-4 h-4 shrink-0" />
                              <span className="sidebar-nav-label">
                                {sub.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
            } else {
              // Regular nav item
              const isActive = location.pathname === item.to;
              itemNode = (
                <SidebarTooltip label={item.label} show={collapsed}>
                  <Link
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "sidebar-nav-item",
                      collapsed && "sidebar-nav-item--icon-only",
                      isActive && "sidebar-nav-item--active",
                    )}
                    style={{
                      background: isActive
                        ? "var(--accent-light)"
                        : "transparent",
                      color: isActive
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    }}
                  >
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && (
                      <span className="sidebar-nav-label">{item.label}</span>
                    )}
                  </Link>
                </SidebarTooltip>
              );
            }

            return (
              <Fragment key={item.to}>
                {sectionLabel && !collapsed && (
                  <p className="sidebar-section-label">{sectionLabel}</p>
                )}
                {sectionLabel && collapsed && item.to !== "/dashboard" && (
                  <div className="sidebar-section-divider" />
                )}
                {itemNode}
              </Fragment>
            );
          })}
        </nav>

        {/* User Menu Footer */}
        <div
          className="shrink-0 border-t p-2"
          style={{ borderColor: "var(--border)" }}
        >
          {collapsed ? <UserMenuCollapsed /> : <UserMenu />}
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
          role="dialog"
          aria-modal="true"
          aria-label="Sidebar overlay"
        />
      )}

      {/* ==================== CONTENT ==================== */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header
          className="shrink-0 h-14 border-b flex items-center px-4 gap-3"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden shrink-0 p-1.5 rounded-md hover:bg-(--bg-hover)"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="main-sidebar"
          >
            <Menu
              className="w-5 h-5"
              style={{ color: "var(--text-secondary)" }}
              aria-hidden
            />
          </button>

          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md hover:bg-(--bg-hover) transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen
                className="w-4.5 h-[18px]"
                style={{ color: "var(--text-secondary)" }}
                aria-hidden
              />
            ) : (
              <PanelLeftClose
                className="w-4.5 h-[18px]"
                style={{ color: "var(--text-secondary)" }}
                aria-hidden
              />
            )}
          </button>

          <div
            className="hidden lg:block w-px h-5"
            style={{ background: "var(--border)" }}
          />

          <div className="flex-1 min-w-0 overflow-hidden flex items-center">
            <Breadcrumb />
          </div>
        </header>

        {/* Main */}
        <main
          className="flex-1 overflow-auto p-4 lg:px-8 lg:py-6 min-w-0"
          style={{ background: "var(--bg)" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* --------------------------------------------------
   Collapsed user menu: just avatar
   -------------------------------------------------- */
function UserMenuCollapsed() {
  const { user } = useAuthStore();
  return (
    <SidebarTooltip label={user?.name || "User"} show={true}>
      <Link
        to="/profile"
        className="sidebar-nav-item sidebar-nav-item--icon-only"
        style={{ color: "var(--text-secondary)" }}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt=""
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
      </Link>
    </SidebarTooltip>
  );
}
