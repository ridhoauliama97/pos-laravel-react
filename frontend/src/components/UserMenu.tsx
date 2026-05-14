import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores";
import {
  useThemeStore,
  type ThemeMode,
  type AccentColor,
} from "../stores/themeStore";
import { useT } from "../i18n";
import {
  Check,
  Monitor,
  Sun,
  Moon,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";

const themes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const accents: {
  value: AccentColor;
  label: string;
  lightHex: string;
  darkHex: string;
}[] = [
  { value: "indigo", label: "Indigo", lightHex: "#6366f1", darkHex: "#818cf8" },
  { value: "amber", label: "Amber", lightHex: "#f59e0b", darkHex: "#fbbf24" },
  { value: "gray", label: "Gray", lightHex: "#64748b", darkHex: "#94a3b8" },
  {
    value: "emerald",
    label: "Emerald",
    lightHex: "#10b981",
    darkHex: "#34d399",
  },
  { value: "rose", label: "Rose", lightHex: "#f43f5e", darkHex: "#fb7185" },
  { value: "violet", label: "Violet", lightHex: "#8b5cf6", darkHex: "#a78bfa" },
];

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"theme" | "appearance" | "account">("theme");
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const { mode, accent, resolved, setMode, setAccent } = useThemeStore();
  const navigate = useNavigate();
  const t = useT();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          setTab("theme");
        }}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-(--bg-hover)"
        style={{ color: "var(--text-primary)" }}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt=""
            className="w-8 h-8 rounded-full object-cover ring-2"
            style={{ borderColor: "var(--border)" }}
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 text-left min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {user?.name}
          </p>
          <p
            className="text-xs truncate capitalize"
            style={{ color: "var(--text-muted)" }}
          >
            {user?.role?.replace("_", " ")}
          </p>
        </div>
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 right-0 mb-2 border rounded-xl shadow-lg overflow-hidden animate-fade-in"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {/* Tabs */}
          <div
            className="flex border-b"
            style={{ borderColor: "var(--border)" }}
          >
            {(["theme", "appearance", "account"] as const).map((tabName) => (
              <button
                key={tabName}
                onClick={() => setTab(tabName)}
                className="flex-1 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-(--bg-hover)"
                style={{
                  color:
                    tab === tabName ? "var(--accent)" : "var(--text-muted)",
                  borderBottom:
                    tab === tabName
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                }}
              >
                {tabName === "theme"
                  ? t("userMenu.theme")
                  : tabName === "appearance"
                    ? t("userMenu.style")
                    : t("userMenu.account")}
              </button>
            ))}
          </div>

          {/* Theme Panel */}
          {tab === "theme" && (
            <div className="p-3 space-y-1.5">
              {themes.map((themeItem) => {
                const Icon = themeItem.icon;
                const isActive = mode === themeItem.value;
                return (
                  <button
                    key={themeItem.value}
                    onClick={() => setMode(themeItem.value)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-(--bg-hover)"
                    style={{
                      background: isActive
                        ? "var(--accent-light)"
                        : "transparent",
                      color: isActive
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">
                      {t(`userMenu.${themeItem.value}`)}
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Appearance Panel */}
          {tab === "appearance" && (
            <div className="p-3">
              <p
                className="text-xs font-medium mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                {t("userMenu.accentColor")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {accents.map((a) => {
                  const isActive = accent === a.value;
                  return (
                    <button
                      key={a.value}
                      onClick={() => setAccent(a.value)}
                      className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs transition-all hover:bg-(--bg-hover)"
                      style={{
                        background: isActive
                          ? "var(--accent-light)"
                          : "transparent",
                        color: isActive
                          ? "var(--accent)"
                          : "var(--text-secondary)",
                        boxShadow: isActive
                          ? "0 0 0 2px var(--accent)"
                          : "none",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{
                          background:
                            resolved === "dark" ? a.darkHex : a.lightHex,
                        }}
                      />
                      <span>{t(`userMenu.${a.value}`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account Panel */}
          {tab === "account" && (
            <div className="p-3 space-y-1.5">
              <button
                onClick={() => {
                  navigate("/profile");
                  setOpen(false);
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-(--bg-hover)"
                style={{ color: "var(--text-secondary)" }}
              >
                <User className="w-4 h-4" />
                <span>{t("userMenu.profile")}</span>
              </button>

              <div
                className="border-t pt-1.5 mt-1.5"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t("userMenu.logout")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
