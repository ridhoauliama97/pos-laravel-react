import { useT } from "../i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Shield, Lock, Search, Check, LayoutGrid, List, AlertTriangle, CheckSquare, LayoutDashboard, Package, Layers, Truck, Users, ShoppingCart, History, BarChart3, Settings, Warehouse, Ticket, GitMerge } from "lucide-react";
import { useState, useMemo } from "react";
import type { Role, Permission } from "../types";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { Modal } from "../components/Modal";

export default function RolesPage() {
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    display_name: "",
    description: "",
  });
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>("");
  
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [permSearch, setPermSearch] = useState("");

  const queryClient = useQueryClient();
  const t = useT();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SETTINGS_ROLES);

  const { data, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<Role[]>("/roles"),
  });
  const { data: permData } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => api.get<Permission[]>("/settings/permissions"),
  });

  const roles = data?.data || [];
  const permissions = permData?.data || [];

  // Group permissions
  const groupedPermissions = useMemo(() => {
    return permissions.reduce(
      (acc, p) => {
        if (!acc[p.group]) acc[p.group] = [];
        acc[p.group].push(p);
        return acc;
      },
      {} as Record<string, Permission[]>,
    );
  }, [permissions]);

  // Filtered groups based on search
  const filteredGroups = useMemo(() => {
    if (!permSearch.trim()) return groupedPermissions;
    const q = permSearch.toLowerCase();
    const result: Record<string, Permission[]> = {};
    for (const [group, perms] of Object.entries(groupedPermissions)) {
      const filtered = perms.filter(
        (p) =>
          p.display_name.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          group.toLowerCase().includes(q),
      );
      if (filtered.length > 0) result[group] = filtered;
    }
    return result;
  }, [groupedPermissions, permSearch]);

  const saveMutation = useMutation({
    mutationFn: (d: typeof form) =>
      editingId ? api.put(`/roles/${editingId}`, d) : api.post("/roles", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setShowModal(false);
      setEditingId(null);
      setForm({ name: "", display_name: "", description: "" });
      toast.success(editingId ? t("roles.updated") : t("roles.created"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setSelectedIds((prev) => prev.filter((i) => i !== deleteMutation.variables));
      toast.success(t("roles.deleted"));
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.delete(`/roles/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      toast.success(t("roles.deleted"));
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || err.message),
  });

  const syncPermissionsMutation = useMutation({
    mutationFn: (d: { id: number; permission_ids: number[] }) =>
      api.put(`/roles/${d.id}/permissions`, {
        permission_ids: d.permission_ids,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setShowPermissionsModal(false);
      toast.success(t("roles.permissionsUpdated"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (r: Role) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      display_name: r.display_name,
      description: r.description || "",
    });
    setShowModal(true);
  };

  const openPermissions = (r: Role) => {
    setSelectedRole(r);
    setSelectedPermissions(r.permissions?.map((p) => p.id) || []);
    setPermSearch("");
    const groups = Object.keys(groupedPermissions);
    if (groups.length > 0) setActiveGroup(groups[0]);
    setShowPermissionsModal(true);
  };

  const togglePermission = (id: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const selectAllGroup = (group: string, check: boolean) => {
    const ids = groupedPermissions[group].map((p) => p.id);
    if (check) {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      setSelectedPermissions((prev) => prev.filter((p) => !ids.includes(p)));
    }
  };

  const selectAll = () => {
    setSelectedPermissions(permissions.map((p) => p.id));
  };

  const deselectAll = () => {
    setSelectedPermissions([]);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(roles.map((r: Role) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isSuperAdmin = selectedRole?.name === "super_admin";

  const getGroupIcon = (group: string) => {
    const g = group.toLowerCase();
    if (g.includes("dashboard")) return <LayoutDashboard className="w-4 h-4" />;
    if (g.includes("product")) return <Package className="w-4 h-4" />;
    if (g.includes("categor")) return <Layers className="w-4 h-4" />;
    if (g.includes("supplier")) return <Truck className="w-4 h-4" />;
    if (g.includes("customer")) return <Users className="w-4 h-4" />;
    if (g.includes("pos")) return <ShoppingCart className="w-4 h-4" />;
    if (g.includes("sale") || g.includes("history")) return <History className="w-4 h-4" />;
    if (g.includes("report")) return <BarChart3 className="w-4 h-4" />;
    if (g.includes("setting")) return <Settings className="w-4 h-4" />;
    if (g.includes("stock") || g.includes("inventor") || g.includes("adjust") || g.includes("mutat")) return <Warehouse className="w-4 h-4" />;
    if (g.includes("promo")) return <Ticket className="w-4 h-4" />;
    if (g.includes("user")) return <Users className="w-4 h-4" />;
    if (g.includes("branch")) return <GitMerge className="w-4 h-4" />;
    if (g.includes("role")) return <Shield className="w-4 h-4" />;
    return <Lock className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-[var(--accent)]" />
            {t("roles.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("roles.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-[var(--accent)] text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-[var(--accent)] text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="btn btn-danger h-10 px-4 flex items-center gap-2 shadow-lg shadow-rose-500/20"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t("common.delete")}</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-bold">
                {selectedIds.length}
              </span>
            </button>
          )}

          {canManage && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm({ name: "", display_name: "", description: "" });
                setShowModal(true);
              }}
              className="btn btn-primary h-10 px-4 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-5 h-5" />
              <span>{t("roles.add")}</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="table-card overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-xl rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={roles.length > 0 && selectedIds.length === roles.length}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selectedIds.length > 0 && selectedIds.length < roles.length;
                        }
                      }}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("roles.table.name")}
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("roles.table.description")}
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                    {t("roles.table.system")}
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                    {t("roles.table.permissions")}
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-slate-500 font-medium">{t("common.loading")}</span>
                      </div>
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <Shield className="w-16 h-16 mb-4" />
                        <p className="text-lg font-medium">{t("roles.empty")}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  roles.map((r) => (
                    <tr
                      key={r.id}
                      className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        selectedIds.includes(r.id) ? "bg-[var(--accent-light)]/30" : ""
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                            {r.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {r.display_name}
                            </div>
                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {r.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 italic">
                        {r.description || "—"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {r.is_system ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20">
                            {t("common.yes")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20">
                            {t("common.no")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                          <Lock className="w-3 h-3" />
                          {r.permissions?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canManage && (
                            <>
                              <button
                                onClick={() => openPermissions(r)}
                                className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 transition-colors"
                                title={t("roles.managePermissions")}
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEdit(r)}
                                className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors"
                                title={t("common.edit")}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {!r.is_system && (
                                <button
                                  onClick={() => {
                                    if (confirm(t("roles.deleteConfirm")))
                                      deleteMutation.mutate(r.id);
                                  }}
                                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 transition-colors"
                                  title={t("common.delete")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 text-center bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-medium">{t("common.loading")}</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-20 text-slate-500" />
              <p className="text-slate-500 font-medium">{t("roles.empty")}</p>
            </div>
          ) : (
            roles.map((r) => (
              <div
                key={r.id}
                className={`group relative flex flex-col bg-white dark:bg-slate-900 border transition-all duration-300 rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 ${
                  selectedIds.includes(r.id)
                    ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/50 bg-[var(--accent-light)]/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-[var(--accent)]/50"
                }`}
              >
                {/* Selection Overlay */}
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="w-5 h-5 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer shadow-sm"
                  />
                </div>

                {/* Card Content */}
                <div className="p-6 pt-12 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                        {r.display_name.charAt(0).toUpperCase()}
                      </div>
                      {r.is_system && (
                        <div className="absolute -bottom-1 -right-1 bg-sky-500 text-white p-1 rounded-lg shadow-md border-2 border-white dark:border-slate-900">
                          <Settings className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[var(--accent)] transition-colors">
                        {r.display_name}
                      </h3>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block mt-1">
                        {r.name}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 italic mb-6">
                    {r.description || "Tidak ada deskripsi"}
                  </p>

                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                            <Users className="w-3 h-3 text-slate-400" />
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Aktif
                      </span>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex items-center gap-1.5">
                      <Lock className="w-3 h-3" />
                      {r.permissions?.length || 0}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/50 flex justify-end gap-2">
                  <button
                    onClick={() => openPermissions(r)}
                    className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition-all active:scale-95"
                    title={t("roles.managePermissions")}
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-all active:scale-95"
                    title={t("common.edit")}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {!r.is_system && (
                    <button
                      onClick={() => {
                        if (confirm(t("roles.deleteConfirm")))
                          deleteMutation.mutate(r.id);
                      }}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-all active:scale-95"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title={t("common.confirm")}
        size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(false)}
              className="btn btn-ghost flex-1"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              disabled={bulkDeleteMutation.isPending}
              className="btn btn-danger flex-1"
            >
              {bulkDeleteMutation.isPending ? t("common.loading") : t("common.delete")}
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center p-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center mb-6 animate-bounce-subtle">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Hapus {selectedIds.length} Role?
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Tindakan ini akan menghapus data role yang dipilih secara permanen. Pastikan tidak ada user yang terikat dengan role ini.
          </p>
        </div>
      </Modal>

      {/* ── CRUD Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? t("roles.editTitle") : t("roles.addTitle")}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn btn-ghost"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              form="role-form"
              disabled={saveMutation.isPending}
              className="btn btn-primary"
            >
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
          </>
        }
      >
        <form
          id="role-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="flex flex-col gap-4"
        >
          <div className="form-group">
            <label className="form-label">{t("roles.form.name")}</label>
            <input
              required
              placeholder={t("roles.form.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
              disabled={
                editingId !== null &&
                roles.find((r: Role) => r.id === editingId)?.is_system
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("roles.form.displayName")}</label>
            <input
              required
              placeholder={t("roles.form.displayNamePlaceholder")}
              value={form.display_name}
              onChange={(e) =>
                setForm({ ...form, display_name: e.target.value })
              }
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("roles.form.description")}</label>
            <textarea
              placeholder={t("roles.form.descriptionPlaceholder")}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="form-input"
              rows={3}
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showPermissionsModal && !!selectedRole}
        onClose={() => setShowPermissionsModal(false)}
        title={t("roles.managePermissions")}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-500 font-medium">
              {!isSuperAdmin && (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                  {selectedPermissions.length} {t("common.selected")}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
                className="btn btn-ghost px-6"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() =>
                  selectedRole &&
                  syncPermissionsMutation.mutate({
                    id: selectedRole.id,
                    permission_ids: selectedPermissions,
                  })
                }
                disabled={syncPermissionsMutation.isPending || isSuperAdmin}
                className="btn btn-primary px-8 shadow-lg shadow-indigo-500/20"
              >
                {syncPermissionsMutation.isPending
                  ? t("common.saving")
                  : t("common.save")}
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col h-[75vh] min-h-[500px] overflow-hidden -m-6">
          {/* Header Info Section */}
          <div className="shrink-0 p-6 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-xl shadow-indigo-500/30">
                    {selectedRole?.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-[var(--accent)] shadow-md">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-2xl text-slate-900 dark:text-white tracking-tight">
                    {selectedRole?.display_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
                      {selectedRole?.name}
                    </span>
                    {isSuperAdmin ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 uppercase">
                        Super Admin
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase">
                        Role
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isSuperAdmin && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-(--accent) transition-colors" />
                    <input
                      type="text"
                      className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-(--accent)/20 focus:border-(--accent) outline-none transition-all shadow-sm"
                      placeholder="Cari izin akses..."
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex-1 sm:flex-none text-[10px] font-bold text-slate-600 hover:text-[var(--accent)] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[var(--accent)] transition-all bg-white dark:bg-slate-900 shadow-sm"
                      onClick={selectAll}
                    >
                      PILIH SEMUA
                    </button>
                    <button
                      type="button"
                      className="flex-1 sm:flex-none text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-200 transition-all bg-white dark:bg-slate-900 shadow-sm"
                      onClick={deselectAll}
                    >
                      BATAL SEMUA
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {isSuperAdmin ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-950">
                <div className="relative mb-8 scale-110">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner">
                    <Shield className="w-12 h-12" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-950">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="font-bold text-2xl text-slate-900 dark:text-white mb-4 tracking-tight">Akses Administrator Utama</h3>
                <p className="max-w-md text-slate-500 dark:text-slate-400 leading-relaxed text-base">
                  Peran ini memiliki izin penuh terhadap seluruh fitur sistem. 
                  <span className="block mt-4 text-amber-600 dark:text-amber-400 font-bold text-sm bg-amber-50 dark:bg-amber-500/5 py-2 px-4 rounded-xl border border-amber-100 dark:border-amber-500/10">
                    Keamanan tingkat tinggi diaktifkan untuk peran ini.
                  </span>
                </p>
              </div>
            ) : (
              <>
                {/* Slim Quick-Nav Sidebar */}
                <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 overflow-y-auto custom-scrollbar hidden lg:block">
                  <div className="p-5 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-4">MODUL AKSES</p>
                    {Object.entries(filteredGroups).map(([group, perms]) => {
                      const selectedCount = perms.filter(p => selectedPermissions.includes(p.id)).length;
                      const totalCount = perms.length;
                      const isComplete = selectedCount === totalCount;
                      const isActive = activeGroup === group;

                      return (
                        <button
                          key={group}
                          onClick={() => {
                            setActiveGroup(group);
                            const element = document.getElementById(`group-${group}`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 ${
                            isActive
                              ? "bg-white dark:bg-slate-800 shadow-xl shadow-indigo-500/5 border border-slate-200 dark:border-slate-700 ring-1 ring-slate-100 dark:ring-slate-700"
                              : "hover:bg-slate-200/50 dark:hover:bg-slate-800/30 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <div className={`p-2 rounded-xl transition-all duration-300 ${
                            isActive ? "bg-[var(--accent)] text-white shadow-lg shadow-indigo-500/20 scale-110" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                          }`}>
                            {getGroupIcon(group)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold truncate mb-1.5 ${isActive ? "text-slate-900 dark:text-white" : ""}`}>
                              {group}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-700 ease-out ${isComplete ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`}
                                  style={{ width: `${(selectedCount/totalCount)*100}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-mono font-bold opacity-70">{selectedCount}/{totalCount}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Unified Permissions Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth bg-white dark:bg-slate-950">
                  <div className="p-8 space-y-12">
                    {Object.entries(filteredGroups).length === 0 ? (
                      <div className="py-24 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-300">
                          <Search className="w-10 h-10" />
                        </div>
                        <h4 className="text-slate-900 dark:text-white font-bold mb-2">Hasil Tidak Ditemukan</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Coba kata kunci lain atau periksa ejaan Anda.</p>
                      </div>
                    ) : (
                      Object.entries(filteredGroups).map(([group, perms]) => {
                        const allSelected = perms.every(p => selectedPermissions.includes(p.id));
                        const selectedCount = perms.filter(p => selectedPermissions.includes(p.id)).length;

                        return (
                          <div key={group} id={`group-${group}`} className="scroll-mt-8">
                            <div className="sticky top-0 z-20 py-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 mb-6 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-[var(--accent)] shadow-inner">
                                  {getGroupIcon(group)}
                                </div>
                                <div>
                                  <h3 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">
                                    {group}
                                  </h3>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {selectedCount} dari {perms.length} Izin Aktif
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => selectAllGroup(group, !allSelected)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold transition-all border-2 ${
                                  allSelected
                                    ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                    : "bg-white text-[var(--accent)] border-slate-100 hover:border-[var(--accent)] dark:bg-slate-900 dark:border-slate-800 dark:hover:border-[var(--accent)] shadow-sm"
                                }`}
                              >
                                {allSelected ? <Trash2 className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                                {allSelected ? "BATAL SEMUA" : "PILIH SEMUA"}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                              {perms.map((p) => {
                                const isChecked = selectedPermissions.includes(p.id);
                                return (
                                  <label
                                    key={p.id}
                                    className={`relative flex items-center gap-4 p-5 rounded-[1.25rem] cursor-pointer transition-all border-2 group ${
                                      isChecked
                                        ? "bg-white dark:bg-slate-900 border-[var(--accent)] shadow-xl shadow-indigo-500/10 ring-1 ring-[var(--accent)]/5 scale-[1.02] z-10"
                                        : "bg-slate-50/50 dark:bg-slate-900/30 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${
                                      isChecked
                                        ? "bg-[var(--accent)] border-[var(--accent)] shadow-lg shadow-indigo-500/30"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 group-hover:border-slate-300"
                                    }`}>
                                      {isChecked && <Check className="w-4 h-4 text-white stroke-[4px] animate-in zoom-in-50" />}
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(p.id)}
                                      className="hidden"
                                    />
                                    <div className="flex-1 min-w-0 pr-2">
                                      <div className={`text-sm font-bold leading-tight mb-1 transition-colors ${
                                        isChecked ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"
                                      }`}>
                                        {p.display_name}
                                      </div>
                                      <div className="text-[10px] font-mono font-bold tracking-tight text-slate-400 uppercase truncate opacity-60">
                                        {p.name}
                                      </div>
                                    </div>
                                    {isChecked && (
                                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
