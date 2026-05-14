import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../stores";
import { Check, ChevronDown, Building2 } from "lucide-react";

export default function BranchDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { tenant, branches, selectedBranchId, setSelectedBranch, user } =
    useAuthStore();

  const isSuperAdmin = user?.role === "super_admin";
  const currentBranch = branches.find((b) => b.id === selectedBranchId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!tenant) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => isSuperAdmin && setOpen(!open)}
        className={`flex items-center gap-2 w-full text-left ${isSuperAdmin ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-(--text-primary) truncate flex items-center gap-1.5">
            {tenant.logo ? (
              <img
                src={tenant.logo}
                alt=""
                className="w-5 h-5 rounded object-contain shrink-0"
              />
            ) : null}
            {tenant.name}
          </p>
          <p className="text-xs text-(--text-muted) truncate">
            {currentBranch?.name || user?.branch?.name || "Pusat"}
          </p>
        </div>
        {isSuperAdmin && (
          <ChevronDown
            className={`w-4 h-4 text-(--text-muted) shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && isSuperAdmin && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-(--bg-card) border border-(--border) rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
          <div className="p-2 border-b border-(--border)">
            <p className="px-2 py-1 text-xs font-medium text-(--text-muted)">
              Switch Branch
            </p>
          </div>
          <div className="p-2 max-h-48 overflow-y-auto space-y-0.5">
            {branches.map((b) => {
              const isActive = b.id === selectedBranchId;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBranch(b.id);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all ${isActive ? "font-medium" : "text-(--text-secondary) hover:bg-(--bg-hover)"}`}
                  style={{
                    background: isActive
                      ? "var(--accent-light)"
                      : "transparent",
                    color: isActive ? "var(--accent)" : "",
                  }}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{b.name}</span>
                  {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
