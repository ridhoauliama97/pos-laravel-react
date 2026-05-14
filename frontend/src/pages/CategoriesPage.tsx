import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Tag, LayoutGrid, List, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useT } from "../i18n";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { Modal } from "../components/Modal";

export default function CategoriesPage() {
  const t = useT();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.CATEGORIES_MANAGE);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<any[]>("/categories"),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editingId
        ? api.put(`/categories/${editingId}`, { name })
        : api.post("/categories", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowModal(false);
      setEditingId(null);
      setName("");
      toast.success(
        editingId ? t("categories.updated") : t("categories.created"),
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setSelectedIds((prev) => prev.filter((i) => i !== deleteMutation.variables));
      toast.success(t("categories.deleted"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.delete(`/categories/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      toast.success(t("categories.deleted"));
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || err.message),
  });

  const categories = data?.data || [];

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(categories.map((c: any) => c.id));
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
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("categories.title")}</h1>
          <p className="page-subtitle">{t("categories.subtitle")}</p>
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
                setName("");
                setShowModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> {t("categories.add")}
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
                      checked={categories.length > 0 && selectedIds.length === categories.length}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selectedIds.length > 0 && selectedIds.length < categories.length;
                        }
                      }}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                  </th>
                  <th>{t("categories.form.name")}</th>
                  <th className="center">{t("categories.productCount")}</th>
                  {canManage && <th className="right">{t("common.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={canManage ? 4 : 3} className="table-empty">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 4 : 3} className="table-empty">
                      <Tag style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto .75rem", opacity: 0.3 }} />
                      <p>{t("categories.empty")}</p>
                    </td>
                  </tr>
                ) : (
                  categories.map((c: any) => (
                    <tr key={c.id} style={selectedIds.includes(c.id) ? { background: "var(--accent-light)" } : {}}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</div>
                      </td>
                      <td className="center">
                        <span className="badge badge-info">
                          {c.products_count ?? 0}
                        </span>
                      </td>
                      {canManage && (
                        <td className="right">
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: ".25rem" }}>
                            <button
                              onClick={() => {
                                setEditingId(c.id);
                                setName(c.name);
                                setShowModal(true);
                              }}
                              className="btn-icon edit"
                              title={t("common.edit")}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`${t("categories.deleteConfirm")} "${c.name}"?`))
                                  deleteMutation.mutate(c.id);
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
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {isLoading ? (
            <div className="table-empty" style={{ gridColumn: "1 / -1", background: "var(--bg-card)", borderRadius: "var(--radius)" }}>
              {t("common.loading")}
            </div>
          ) : categories.length === 0 ? (
            <div className="table-empty" style={{ gridColumn: "1 / -1", background: "var(--bg-card)", borderRadius: "var(--radius)" }}>
              <Tag style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto .75rem", opacity: 0.3 }} />
              <p>{t("categories.empty")}</p>
            </div>
          ) : (
            categories.map((c: any) => (
              <div
                key={c.id}
                className="card"
                style={{
                  position: "relative",
                  padding: "1.125rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "box-shadow .2s, transform .2s",
                  border: selectedIds.includes(c.id) ? "1px solid var(--accent)" : "1px solid var(--border)",
                  boxShadow: selectedIds.includes(c.id) ? "0 0 0 1px var(--accent)" : "var(--shadow-sm)",
                }}
                onMouseEnter={(e) => {
                  if (!selectedIds.includes(c.id)) {
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedIds.includes(c.id)) {
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
                    (e.currentTarget as HTMLElement).style.transform = "";
                  }
                }}
              >
                <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", zIndex: 10 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    style={{ accentColor: "var(--accent)", width: "1rem", height: "1rem", cursor: "pointer" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                  <div
                    className="stat-icon"
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: ".4rem",
                      flexShrink: 0,
                    }}
                  >
                    <Tag style={{ width: "1rem", height: "1rem" }} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontSize: ".9375rem",
                      }}
                    >
                      {c.name}
                    </p>
                    <p
                      style={{
                        fontSize: ".75rem",
                        color: "var(--text-muted)",
                        marginTop: ".1rem",
                      }}
                    >
                      {c.products_count ?? 0} {t("categories.productCount")}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div style={{ display: "flex", gap: ".25rem", flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setName(c.name);
                        setShowModal(true);
                      }}
                      className="btn-icon edit"
                      title={t("common.edit")}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`${t("categories.deleteConfirm")} "${c.name}"?`))
                          deleteMutation.mutate(c.id);
                      }}
                      className="btn-icon danger"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? t("categories.editTitle") : t("categories.addTitle")}
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
              form="category-form"
              disabled={saveMutation.isPending}
              className="btn btn-primary"
            >
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
          </>
        }
      >
        <form
          id="category-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <div className="form-group">
            <label className="form-label">{t("categories.form.name")} *</label>
            <input
              required
              placeholder={t("categories.form.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
