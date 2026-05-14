import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  LayoutGrid,
  List,
  AlertTriangle,
  UserCheck,
  Award,
  Activity,
} from "lucide-react";
import { useState } from "react";
import type { Customer, CustomerStats } from "../types";
import { useT } from "../i18n";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { Modal } from "../components/Modal";

const TIER_STYLE: Record<string, string> = {
  bronze: "badge-warning",
  silver: "badge-gray",
  gold: "badge-info",
  platinum: "badge-success",
};

export default function CustomersPage() {
  const t = useT();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    is_active: true,
    is_member: false,
  });
  const queryClient = useQueryClient();

  const params = new URLSearchParams({ search, page: String(page) });
  if (statusFilter) params.set("is_active", statusFilter);
  if (memberFilter) params.set("is_member", memberFilter);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customers", search, page, statusFilter, memberFilter],
    queryFn: () =>
      api.get<Customer[]>(`/customers?${params}`),
  });

  const { data: statsData } = useQuery({
    queryKey: ["customers-stats"],
    queryFn: () => api.get<CustomerStats>("/customers/stats"),
  });

  const stats = statsData?.data;

  const saveMutation = useMutation({
    mutationFn: (d: any) =>
      editingId
        ? api.put(`/customers/${editingId}`, d)
        : api.post("/customers", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-stats"] });
      setShowModal(false);
      setEditingId(null);
      setForm({ name: "", phone: "", email: "", address: "", is_active: true, is_member: false });
      toast.success(
        editingId ? t("customers.updated") : t("customers.created"),
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.delete(`/customers/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-stats"] });
      toast.success(t("customers.deleted"));
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setShowBulkDeleteModal(false);
    },
  });

  const customers = data?.data || [];
  const meta = data?.meta;

  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length && customers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (isError)
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("customers.title")}</h1>
          <p className="page-subtitle">{t("customers.subtitle")}</p>
        </div>
        {hasPermission(PERMISSIONS.CUSTOMERS_CREATE) && (
          <button
            onClick={() => {
              setEditingId(null);
              setForm({ name: "", phone: "", email: "", address: "", is_active: true, is_member: false });
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> {t("customers.add")}
          </button>
        )}
      </div>

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
            <Users className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <div>
              <p className="stat-value">{stats.total}</p>
              <p className="stat-label">{t("customers.stats.total")}</p>
            </div>
          </div>
          <div className="stat-card">
            <UserCheck className="w-5 h-5" style={{ color: "#22c55e" }} />
            <div>
              <p className="stat-value">{stats.active}</p>
              <p className="stat-label">{t("customers.stats.active")}</p>
            </div>
          </div>
          <div className="stat-card">
            <Award className="w-5 h-5" style={{ color: "#f59e0b" }} />
            <div>
              <p className="stat-value">{stats.member}</p>
              <p className="stat-label">{t("customers.stats.member")}</p>
            </div>
          </div>
          <div className="stat-card">
            <Activity className="w-5 h-5" style={{ color: "#3b82f6" }} />
            <div>
              <p className="stat-value">{stats.has_transactions}</p>
              <p className="stat-label">{t("customers.stats.hasTransactions")}</p>
            </div>
          </div>
        </div>
      )}

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
        <div
          className="search-wrap"
          style={{ maxWidth: "22rem", flexGrow: 1 }}
        >
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder={t("customers.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="search-input"
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="form-input"
            style={{ width: "auto", padding: "0.375rem 1.5rem 0.375rem 0.5rem" }}
          >
            <option value="">{t("customers.filters.all")}</option>
            <option value="1">{t("customers.filters.active")}</option>
            <option value="0">{t("customers.filters.inactive")}</option>
          </select>

          <select
            value={memberFilter}
            onChange={(e) => { setMemberFilter(e.target.value); setPage(1); }}
            className="form-input"
            style={{ width: "auto", padding: "0.375rem 1.5rem 0.375rem 0.5rem" }}
          >
            <option value="">{t("customers.filters.all")}</option>
            <option value="1">{t("customers.filters.member")}</option>
            <option value="0">{t("customers.filters.nonMember")}</option>
          </select>

          {selectedIds.length > 0 && hasPermission(PERMISSIONS.CUSTOMERS_DELETE) && (
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
            className="view-toggle"
            style={{
              display: "flex",
              background: "var(--bg)",
              padding: "0.25rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => setViewMode("list")}
              className={`btn-icon ${viewMode === "list" ? "active" : ""}`}
              style={{
                background:
                  viewMode === "list" ? "var(--bg-card)" : "transparent",
                boxShadow: viewMode === "list" ? "var(--shadow-sm)" : "none",
              }}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`btn-icon ${viewMode === "grid" ? "active" : ""}`}
              style={{
                background:
                  viewMode === "grid" ? "var(--bg-card)" : "transparent",
                boxShadow: viewMode === "grid" ? "var(--shadow-sm)" : "none",
              }}
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
                      checked={
                        customers.length > 0 &&
                        selectedIds.length === customers.length
                      }
                      ref={(input) => {
                        if (input) {
                          input.indeterminate =
                            selectedIds.length > 0 &&
                            selectedIds.length < customers.length;
                        }
                      }}
                      onChange={toggleSelectAll}
                      className="form-checkbox"
                    />
                  </th>
                  <th>{t("customers.table.customer")}</th>
                  <th>{t("customers.table.phone")}</th>
                  <th>{t("customers.table.email")}</th>
                  <th>{t("customers.table.status")}</th>
                  <th>{t("customers.table.member")}</th>
                  <th className="center">{t("customers.table.tier")}</th>
                  <th className="right">{t("customers.table.points")}</th>
                  <th className="right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="table-empty">
                      {t("customers.loading")}
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="table-empty">
                      <Users
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          margin: "0 auto .75rem",
                          opacity: 0.3,
                        }}
                      />
                      <p>
                        {t("customers.empty")}
                        {search ? ` "${search}"` : ""}
                      </p>
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr
                      key={c.id}
                      className={selectedIds.includes(c.id) ? "selected-row" : ""}
                    >
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="form-checkbox"
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
                              borderRadius: "50%",
                              background: c.is_active ? "var(--accent-light)" : "var(--bg)",
                              color: c.is_active ? "var(--accent)" : "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: ".75rem",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500, color: c.is_active ? undefined : "var(--text-muted)" }}>
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="muted">{c.phone || "—"}</td>
                      <td className="muted">{c.email || "—"}</td>
                      <td>
                        <span className={`badge ${c.is_active ? "badge-success" : "badge-danger"}`}>
                          {c.is_active ? t("customers.badge.active") : t("customers.badge.inactive")}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.is_member ? "badge-info" : "badge-gray"}`}>
                          {c.is_member ? t("customers.badge.member") : t("customers.badge.regular")}
                        </span>
                      </td>
                      <td className="center">
                        <span
                          className={`badge ${TIER_STYLE[c.member_tier] ?? "badge-gray"}`}
                          style={{ textTransform: "capitalize" }}
                        >
                          {c.member_tier}
                        </span>
                      </td>
                      <td className="right" style={{ fontWeight: 600 }}>
                        {c.points?.toLocaleString("id")}
                      </td>
                      <td className="right">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: ".25rem",
                          }}
                        >
                          {hasPermission(PERMISSIONS.CUSTOMERS_EDIT) && (
                            <button
                              onClick={() => {
                                setEditingId(c.id);
                                setForm({
                                  name: c.name,
                                  phone: c.phone || "",
                                  email: c.email || "",
                                  address: c.address || "",
                                  is_active: c.is_active,
                                  is_member: c.is_member,
                                });
                                setShowModal(true);
                              }}
                              className="btn-icon edit"
                              title={t("common.edit")}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission(PERMISSIONS.CUSTOMERS_DELETE) && (
                            <button
                              onClick={() => {
                                setEditingId(c.id);
                                setShowBulkDeleteModal(true);
                                setSelectedIds([c.id]);
                              }}
                              className="btn-icon danger"
                              title={t("common.delete")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
        <div
          className="grid-view"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "220px", borderRadius: "var(--radius)" }} />
            ))
          ) : customers.length === 0 ? (
            <div
              className="table-empty"
              style={{ gridColumn: "1 / -1" }}
            >
              <Users
                style={{
                  width: "3rem",
                  height: "3rem",
                  margin: "0 auto 1rem",
                  opacity: 0.2,
                }}
              />
              <p style={{ fontSize: "1rem", fontWeight: 500 }}>
                {t("customers.empty")}
                {search && <span style={{ color: "var(--accent)" }}> "{search}"</span>}
              </p>
            </div>
          ) : (
            customers.map((c) => (
              <div
                key={c.id}
                className={`card ${selectedIds.includes(c.id) ? "selected-card" : ""}`}
                style={{
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                  position: "relative",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "default",
                  border: selectedIds.includes(c.id) ? "1px solid var(--accent)" : "1px solid var(--border)",
                  boxShadow: selectedIds.includes(c.id) ? "0 0 0 1px var(--accent), var(--shadow-md)" : "var(--shadow-sm)",
                  opacity: c.is_active ? 1 : 0.6,
                }}
                onClick={() => toggleSelect(c.id)}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    zIndex: 2,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="form-checkbox"
                    style={{ width: "1.25rem", height: "1.25rem" }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "50%",
                      background: c.is_active ? "var(--accent-light)" : "var(--bg)",
                      color: c.is_active ? "var(--accent)" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: "1.125rem" }}>
                      {c.name}
                    </h3>
                    <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                      <span className={`badge ${c.is_active ? "badge-success" : "badge-danger"}`}>
                        {c.is_active ? t("customers.badge.active") : t("customers.badge.inactive")}
                      </span>
                      <span className={`badge ${c.is_member ? "badge-info" : "badge-gray"}`}>
                        {c.is_member ? t("customers.badge.member") : t("customers.badge.regular")}
                      </span>
                      <span
                        className={`badge ${TIER_STYLE[c.member_tier] ?? "badge-gray"}`}
                        style={{ textTransform: "capitalize" }}
                      >
                        {c.member_tier}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                  }}
                >
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Phone</div>
                    <div>{c.phone || "—"}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Email</div>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.email || "—"}</div>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Points</div>
                    <div style={{ fontWeight: 600 }}>{c.points?.toLocaleString("id")}</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: ".5rem",
                    marginTop: "auto",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {hasPermission(PERMISSIONS.CUSTOMERS_EDIT) && (
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setForm({
                          name: c.name,
                          phone: c.phone || "",
                          email: c.email || "",
                          address: c.address || "",
                          is_active: c.is_active,
                          is_member: c.is_member,
                        });
                        setShowModal(true);
                      }}
                      className="btn-icon edit"
                      title={t("common.edit")}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission(PERMISSIONS.CUSTOMERS_DELETE) && (
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setShowBulkDeleteModal(true);
                        setSelectedIds([c.id]);
                      }}
                      className="btn-icon danger"
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
                onClick={() => setPage((p) => p - 1)}
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
                onClick={() => setPage((p) => p + 1)}
                className="page-nav"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? t("customers.editTitle") : t("customers.addTitle")}
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
              form="customer-form"
              disabled={saveMutation.isPending}
              className="btn btn-primary"
            >
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
          </>
        }
      >
        <form
          id="customer-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="flex flex-col gap-4"
        >
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="form-checkbox"
              />
              {t("customers.form.isActive")}
            </label>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.is_member}
                onChange={(e) => setForm({ ...form, is_member: e.target.checked })}
                className="form-checkbox"
              />
              {t("customers.form.isMember")}
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">{t("customers.form.name")}</label>
            <input
              required
              placeholder={t("customers.form.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("customers.form.phone")}</label>
            <input
              placeholder={t("customers.form.phonePlaceholder")}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("customers.form.email")}</label>
            <input
              type="email"
              placeholder={t("customers.form.emailPlaceholder")}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("customers.form.address")}</label>
            <textarea
              placeholder={t("customers.form.addressPlaceholder")}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="form-textarea"
              rows={2}
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => {
          setShowBulkDeleteModal(false);
          setEditingId(null);
          if (selectedIds.length === 1 && editingId) {
            setSelectedIds([]);
          }
        }}
        title="Confirm Deletion"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowBulkDeleteModal(false);
                setEditingId(null);
                if (selectedIds.length === 1 && editingId) {
                  setSelectedIds([]);
                }
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                bulkDeleteMutation.mutate(selectedIds);
              }}
              disabled={bulkDeleteMutation.isPending}
              className="btn btn-danger"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Trash2 className="w-4 h-4" />
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </>
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            color: "var(--text-color)",
          }}
        >
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
              Are you sure?
            </h4>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              You are about to delete{" "}
              <strong style={{ color: "var(--text-color)" }}>
                {selectedIds.length}
              </strong>{" "}
              customer(s). This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
