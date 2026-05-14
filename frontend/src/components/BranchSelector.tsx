import { useAuthStore } from "../stores";
import { Building2, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function BranchSelector() {
  const { user, branches, selectedBranchId, setSelectedBranch } =
    useAuthStore();
  const [open, setOpen] = useState(false);

  if (!user || user.role !== "super_admin" || branches.length === 0)
    return null;

  const selected = branches.find((b) => b.id === selectedBranchId);
  const currentName = selected?.name || "Pilih Cabang";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors"
      >
        <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="truncate text-gray-700 font-medium">
          {currentName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-50 py-1 max-h-48 overflow-auto">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBranch(b.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                  b.id === selectedBranchId
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
