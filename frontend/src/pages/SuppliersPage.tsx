import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "../i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatCurrency } from "../lib/utils";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Truck,
  UserCheck,
  UserMinus,
  DollarSign,
  LayoutGrid,
  List,
  AlertTriangle,
} from "../components/icons";
import type { Supplier } from "../types";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { Modal } from "../components/Modal";

interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
  total_opening_balance: number;
}

export default function SuppliersPage() {
  const t = useT();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["suppliers", search, page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ search, page: String(page) });
      if (statusFilter) params.set("is_active", statusFilter);
      return api.get<Supplier[]>(`/suppliers?${params}`);
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["suppliers-stats"],
    queryFn: () => api.get<SupplierStats>("/suppliers/stats"),
  });

  const stats = statsData?.data;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-stats"] });
      toast.success(t("suppliers.deleted"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.delete(`/suppliers/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-stats"] });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      toast.success(t("suppliers.deleted"));
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || err.message),
  });

  const suppliers = data?.data || [];
  const meta = data?.meta;

  const toggleSelectAll = () => {
    if (selectedIds.length === suppliers.length && suppliers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suppliers.map((s: Supplier) => s.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (isError) {
    return (
      <div className="page-container">
        <div
          className="card card-body"
          style={{ textAlign: "center", color: "#dc2626", padding: "3rem" }}
        >
          {t("errors.loadFailed")} {(error as any)?.message}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("suppliers.title")}</h1>
          <p className="page-subtitle">{t("suppliers.subtitle")}</p>
        </div>
        {hasPermission(PERMISSIONS.SUPPLIERS_MANAGE) && (
          <button
            onClick={() => navigate("/suppliers/new")}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> {t("suppliers.add")}
          </button>
        )}
      </div>

      {/* Stats Widgets */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: ".75rem",
            marginBottom: "1rem",
          }}
        >
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-value">{stats.total}</p>
              <p className="stat-label">{t("suppliers.stats.total")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-value">{stats.active}</p>
              <p className="stat-label">{t("suppliers.stats.active")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-value">{stats.inactive}</p>
              <p className="stat-label">{t("suppliers.stats.inactive")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-value">{formatCurrency(stats.total_opening_balance)}</p>
              <p className="stat-label">{t("suppliers.stats.totalBalance")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div
        className="actions-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div className="search-wrap" style={{ maxWidth: "18rem", flexGrow: 1 }}>
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder={t("suppliers.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="search-input"
          />
        </div>

        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="form-select"
            style={{ width: "auto", fontSize: ".8125rem", padding: ".35rem .75rem" }}
          >
            <option value="">{t("suppliers.filters.allStatus")}</option>
            <option value="1">{t("common.active")}</option>
            <option value="0">{t("common.inactive")}</option>
          </select>

          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="btn btn-danger"
              style={{ padding: "0.5rem 1rem" }}
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.length})
            </button>
          )}

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
        </div>
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
                      checked={suppliers.length > 0 && selectedIds.length === suppliers.length}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selectedIds.length > 0 && selectedIds.length < suppliers.length;
                        }
                      }}
                      onChange={toggleSelectAll}
                      style={{ accentColor: "var(--accent)" }}
                    />
                  </th>
                  <th>{t("suppliers.table.supplier")}</th>
                  <th>{t("suppliers.table.phone")}</th>
                  <th>{t("suppliers.table.email")}</th>
                  <th>{t("suppliers.table.address")}</th>
                  <th className="center">{t("suppliers.table.status")}</th>
                  <th className="right">{t("suppliers.table.openingBalance")}</th>
                  <th className="right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      {t("suppliers.loading")}
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      <Truck
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          margin: "0 auto .75rem",
                          opacity: 0.3,
                        }}
                      />
                      <p>
                        {t("suppliers.empty")}
                        {search ? ` "${search}"` : ""}
                      </p>
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} style={selectedIds.includes(s.id) ? { background: "var(--accent-light)" } : {}}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: ".625rem",
                          }}
                        >
                          <div
                            style={{
                              width: "2rem",
                              height: "2rem",
                              borderRadius: ".5rem",
                              background: "var(--accent-light)",
                              color: "var(--accent)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: ".75rem",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{s.name}</span>
                        </div>
                      </td>
                      <td className="muted">{s.phone || "—"}</td>
                      <td className="muted">{s.email || "—"}</td>
                      <td
                        className="muted"
                        style={{
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.address || "—"}
                      </td>
                      <td className="center">
                        <span
                          className={`badge ${s.is_active ? "badge-success" : "badge-gray"}`}
                        >
                          {s.is_active
                            ? t("common.active")
                            : t("common.inactive")}
                        </span>
                      </td>
                      <td className="right" style={{ fontWeight: 500 }}>
                        {s.opening_balance
                          ? formatCurrency(s.opening_balance)
                          : "—"}
                      </td>
                      <td className="right">
                        {hasPermission(PERMISSIONS.SUPPLIERS_MANAGE) && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: ".25rem",
                            }}
                          >
                            <button
                              onClick={() => navigate(`/suppliers/${s.id}/edit`)}
                              className="btn-icon edit"
                              title={t("common.edit")}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(t("suppliers.deleteConfirm")))
                                  deleteMutation.mutate(s.id);
                              }}
                              className="btn-icon danger"
                              title={t("common.delete")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="table-pagination">
              <span className="page-text">
                {(meta.current_page - 1) * meta.per_page + 1}–
                {Math.min(meta.current_page * meta.per_page, meta.total)} dari{" "}
                {meta.total}
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: ".25rem" }}
              >
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p: number) => p - 1)}
                  className="page-nav"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === meta.last_page || Math.abs(p - page) <= 2,
                  )
                  .map((p, i, arr) => (
                    <span
                      key={p}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: ".25rem",
                      }}
                    >
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span style={{ color: "var(--text-muted)" }}>…</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={p === page ? "page-current" : "page-default"}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p: number) => p + 1)}
                  className="page-nav"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {isLoading ? (
            <div className="table-empty" style={{ gridColumn: "1 / -1", background: "var(--bg-card)", borderRadius: "var(--radius)" }}>
              {t("suppliers.loading")}
            </div>
          ) : suppliers.length === 0 ? (
            <div className="table-empty" style={{ gridColumn: "1 / -1", background: "var(--bg-card)", borderRadius: "var(--radius)" }}>
              <Truck
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  margin: "0 auto .75rem",
                  opacity: 0.3,
                }}
              />
              <p>
                {t("suppliers.empty")}
                {search ? ` "${search}"` : ""}
              </p>
            </div>
          ) : (
            suppliers.map((s) => (
              <div
                key={s.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "all 0.2s",
                  border: selectedIds.includes(s.id) ? "1px solid var(--accent)" : "1px solid var(--border)",
                  boxShadow: selectedIds.includes(s.id) ? "0 0 0 1px var(--accent)" : "var(--shadow-sm)",
                }}
              >
                <div style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    style={{ accentColor: "var(--accent)", width: "1.25rem", height: "1.25rem", cursor: "pointer" }}
                  />
                </div>
                <div className="card-body" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", paddingRight: "2rem" }}>
                    <div
                      style={{
                        width: "3rem",
                        height: "3rem",
                        borderRadius: "0.5rem",
                        background: "var(--accent-light)",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.125rem" }}>
                        {s.name}
                      </h3>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {s.email || "—"}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                    <span
                      className={`badge ${s.is_active ? "badge-success" : "badge-gray"}`}
                    >
                      {s.is_active
                        ? t("common.active")
                        : t("common.inactive")}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", flex: 1 }}>
                    <div style={{ marginBottom: "0.25rem" }}>
                      <strong>{t("suppliers.table.phone")}:</strong> {s.phone || "—"}
                    </div>
                    <div style={{ marginBottom: "0.25rem" }}>
                      <strong>{t("suppliers.table.address")}:</strong> {s.address || "—"}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t("suppliers.table.openingBalance")}</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.opening_balance ? formatCurrency(s.opening_balance) : "—"}</span>
                  </div>
                </div>

                {hasPermission(PERMISSIONS.SUPPLIERS_MANAGE) && (
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
                      onClick={() => navigate(`/suppliers/${s.id}/edit`)}
                      className="btn-icon edit"
                      title={t("common.edit")}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t("suppliers.deleteConfirm")))
                          deleteMutation.mutate(s.id);
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
        title={`Hapus ${selectedIds.length} Data`}
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
            Hapus {selectedIds.length} data terpilih?
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Aksi ini tidak dapat dibatalkan.
          </p>
        </div>
      </Modal>

    </div>
  );
}
