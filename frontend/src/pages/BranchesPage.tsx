import { useT } from "../i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, GitBranch, LayoutGrid, List, AlertTriangle } from "../components/icons";
import { useState } from "react";
import type { Branch } from "../types";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { Modal } from "../components/Modal";

export default function BranchesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const queryClient = useQueryClient();
  const t = useT();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SETTINGS_BRANCHES);

  const { data, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) =>
      editingId
        ? api.put(`/branches/${editingId}`, d)
        : api.post("/branches", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setShowModal(false);
      setEditingId(null);
      setForm({ name: "", address: "", phone: "" });
      toast.success(editingId ? t("branches.updated") : t("branches.created"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setSelectedIds((prev) => prev.filter((i) => i !== deleteMutation.variables));
      toast.success(t("branches.deleted"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.delete(`/branches/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      toast.success(t("branches.deleted"));
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || err.message),
  });

  const branches = data?.data || [];

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(branches.map((b: Branch) => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("branches.title")}</h1>
          <p className="page-subtitle">{t("branches.subtitle")}</p>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <div
              style={{
                display: "flex",
                background: "var(--bg-hover)",
                padding: "0.25rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                className={`btn-icon ${viewMode === "list" ? "active" : ""}`}
                style={viewMode === "list" ? { background: "var(--bg-card)", boxShadow: "var(--shadow-sm)" } : {}}
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                className={`btn-icon ${viewMode === "grid" ? "active" : ""}`}
                style={viewMode === "grid" ? { background: "var(--bg-card)", boxShadow: "var(--shadow-sm)" } : {}}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="btn btn-danger"
              >
                <Trash2 className="w-4 h-4" /> {t("common.delete")} ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => {
                setEditingId(null);
                setForm({ name: "", address: "", phone: "" });
                setShowModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> {t("branches.add")}
            </button>
          </div>
        )}
      </div>

      {viewMode === "list" ? (
        <div className="table-card">
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "3rem", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={branches.length > 0 && selectedIds.length === branches.length}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selectedIds.length > 0 && selectedIds.length < branches.length;
                        }
                      }}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                  </th>
                  <th>{t("branches.form.name")}</th>
                  <th>{t("branches.form.address")}</th>
                  <th>{t("branches.form.phone")}</th>
                  <th className="center">{t("branches.userCount")}</th>
                  {canManage && <th className="right">{t("common.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="table-empty">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : branches.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="table-empty">
                      <GitBranch style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto .75rem", opacity: 0.3 }} />
                      <p>{t("branches.empty")}</p>
                    </td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr key={b.id} style={selectedIds.includes(b.id) ? { background: "var(--accent-light)" } : {}}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={() => toggleSelect(b.id)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{b.name}</div>
                      </td>
                      <td className="muted">{b.address || "—"}</td>
                      <td className="muted">{b.phone || "—"}</td>
                      <td className="center">
                        <span className="badge badge-info">
                          {(b as any).users_count ?? 0}
                        </span>
                      </td>
                      {canManage && (
                        <td className="right">
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: ".25rem" }}>
                            <button
                              onClick={() => {
                                setEditingId(b.id);
                                setForm({
                                  name: b.name,
                                  address: b.address || "",
                                  phone: b.phone || "",
                                });
                                setShowModal(true);
                              }}
                              className="btn-icon edit"
                              title={t("common.edit")}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(t("branches.deleteConfirm")))
                                  deleteMutation.mutate(b.id);
                              }}
                              className="btn-icon danger"
                              title={t("common.delete")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {isLoading ? (
            <div className="table-empty" style={{ gridColumn: "1 / -1", background: "var(--bg-card)", borderRadius: "var(--radius)" }}>
              {t("common.loading")}
            </div>
          ) : branches.length === 0 ? (
            <div className="table-empty" style={{ gridColumn: "1 / -1", background: "var(--bg-card)", borderRadius: "var(--radius)" }}>
              <GitBranch style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto .75rem", opacity: 0.3 }} />
              <p>{t("branches.empty")}</p>
            </div>
          ) : (
            branches.map((b) => (
              <div
                key={b.id}
                className="card"
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  transition: "box-shadow .2s, transform .2s",
                  border: selectedIds.includes(b.id) ? "1px solid var(--accent)" : "1px solid var(--border)",
                  boxShadow: selectedIds.includes(b.id) ? "0 0 0 1px var(--accent)" : "var(--shadow-sm)",
                }}
                onMouseEnter={(e) => {
                  if (!selectedIds.includes(b.id)) {
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedIds.includes(b.id)) {
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
                    (e.currentTarget as HTMLElement).style.transform = "";
                  }
                }}
              >
                <div style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(b.id)}
                    onChange={() => toggleSelect(b.id)}
                    style={{ accentColor: "var(--accent)", width: "1.25rem", height: "1.25rem", cursor: "pointer" }}
                  />
                </div>
                <div className="card-body" style={{ flex: 1, padding: "1.25rem" }}>
                  <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-start", paddingRight: "2rem" }}>
                    <div className="stat-icon" style={{ flexShrink: 0 }}>
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: ".25rem" }}>
                        {b.name}
                      </h3>
                      <p style={{ fontSize: ".8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {b.address || "—"}
                      </p>
                      <p style={{ fontSize: ".8125rem", color: "var(--text-muted)", marginTop: ".2rem" }}>
                        {b.phone || "—"}
                      </p>
                      <span className="badge badge-info" style={{ marginTop: ".5rem" }}>
                        {(b as any).users_count ?? 0} {t("branches.userCount")}
                      </span>
                    </div>
                  </div>
                </div>
                
                {canManage && (
                  <div
                    style={{
                      padding: "0.75rem 1.25rem",
                      borderTop: "1px solid var(--border)",
                      background: "var(--bg-hover)",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "0.5rem",
                      borderBottomLeftRadius: "var(--radius)",
                      borderBottomRightRadius: "var(--radius)",
                    }}
                  >
                    <button
                      onClick={() => {
                        setEditingId(b.id);
                        setForm({
                          name: b.name,
                          address: b.address || "",
                          phone: b.phone || "",
                        });
                        setShowModal(true);
                      }}
                      className="btn-icon edit"
                      title={t("common.edit")}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t("branches.deleteConfirm")))
                          deleteMutation.mutate(b.id);
                      }}
                      className="btn-icon danger"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Bulk Delete Modal ── */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title={t("common.delete")}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(false)}
              className="btn btn-ghost"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              disabled={bulkDeleteMutation.isPending}
              className="btn btn-danger"
            >
              {bulkDeleteMutation.isPending ? t("common.loading") : t("common.delete")}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "1rem 0" }}>
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "50%",
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <AlertTriangle className="w-8 h-8" />
          </div>
          <p style={{ fontWeight: 600, fontSize: "1.0625rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            {t("common.bulkDeleteConfirm", { count: selectedIds.length })}
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            {t("common.bulkDeleteDesc")}
          </p>
        </div>
      </Modal>

      {/* ── CRUD Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? t("branches.editTitle") : t("branches.addTitle")}
        size="sm"
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
              form="branch-form"
              disabled={saveMutation.isPending}
              className="btn btn-primary"
            >
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
          </>
        }
      >
        <form
          id="branch-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="flex flex-col gap-4"
        >
          <div className="form-group">
            <label className="form-label">{t("branches.form.name")} *</label>
            <input
              required
              placeholder={t("branches.form.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("branches.form.address")}</label>
            <textarea
              placeholder={t("branches.form.addressPlaceholder")}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="form-textarea"
              rows={2}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("branches.form.phone")}</label>
            <input
              placeholder={t("branches.form.phonePlaceholder")}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="form-input"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
