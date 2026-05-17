import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatCurrency, formatDate, exportCSV, exportXLSX } from "../lib/utils";
import toast from "react-hot-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Send,
  CheckCircle,
  Eye,
  Package,
  LayoutGrid,
  List,
  AlertTriangle,
  Trash2,
  Filter,
  X,
  Search,
  Download,
  DollarSign,
  TrendingUp,
  Truck,
} from "../components/icons";
import type { Supplier, Product } from "../types";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { useT } from "../i18n";
import { Modal } from "../components/Modal";
import { SearchSelect } from "../components/SearchSelect";
import { ConfirmDialog } from "../components/ConfirmDialog";

interface POItem {
  product_id: string;
  qty: number;
  price: number;
}

interface Filters {
  supplier_id: string;
  product_id: string;
  date_from: string;
  date_to: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "badge-gray",
  sent: "badge-info",
  partial: "badge-warning",
  completed: "badge-success",
};

export default function PurchaseOrdersPage() {
  const t = useT();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [poSearch, setPoSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{
    supplier_ids: number[];
    notes: string;
    items: POItem[];
  }>({
    supplier_ids: [],
    notes: "",
    items: [{ product_id: "", qty: 1, price: 0 }],
  });
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [receiveConfirmId, setReceiveConfirmId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    supplier_id: "",
    product_id: "",
    date_from: "",
    date_to: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    supplier_id: "",
    product_id: "",
    date_from: "",
    date_to: "",
  });

  const queryClient = useQueryClient();

  const filterParams = new URLSearchParams();
  if (appliedFilters.supplier_id)
    filterParams.set("supplier_id", appliedFilters.supplier_id);
  if (appliedFilters.product_id)
    filterParams.set("product_id", appliedFilters.product_id);
  if (appliedFilters.date_from)
    filterParams.set("date_from", appliedFilters.date_from);
  if (appliedFilters.date_to)
    filterParams.set("date_to", appliedFilters.date_to);
  const filterQuery = filterParams.toString();

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders", filterQuery],
    queryFn: () =>
      api.get<any[]>(`/purchase-orders${filterQuery ? `?${filterQuery}` : ""}`),
  });
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-all"],
    queryFn: () => api.get<Supplier[]>("/suppliers?per_page=200"),
  });
  const { data: productsData } = useQuery({
    queryKey: ["products-all-po"],
    queryFn: () => api.get<Product[]>("/products?per_page=200"),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post("/purchase-orders", {
        supplier_ids: form.supplier_ids,
        notes: form.notes,
        items: form.items.map((i) => ({
          product_id: Number(i.product_id),
          qty: i.qty,
          price: i.price,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setShowModal(false);
      setForm({
        supplier_ids: [],
        notes: "",
        items: [{ product_id: "", qty: 1, price: 0 }],
      });
      toast.success(t("purchaseOrders.created"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-orders/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success(t("purchaseOrders.sent"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-orders/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setReceiveConfirmId(null);
      toast.success(t("purchaseOrders.received"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.delete(`/purchase-orders/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      toast.success(t("purchaseOrders.deleted"));
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || err.message),
  });

  const orders = data?.data || [];
  const filteredOrders = poSearch
    ? orders.filter((o: any) =>
        o.po_number?.toLowerCase().includes(poSearch.toLowerCase()),
      )
    : orders;
  const suppliers = suppliersData?.data || [];
  const products = productsData?.data || [];
  const stats = {
    grandTotal: orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0),
    maxTotal: orders.length ? Math.max(...orders.map((o: any) => Number(o.total || 0))) : 0,
    completed: orders.filter((o: any) => o.status === "completed").length,
    sent: orders.filter((o: any) => o.status === "sent").length,
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredOrders.map((o: any) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("purchaseOrders.title")}</h1>
          <p className="page-subtitle">{t("purchaseOrders.subtitle")}</p>
        </div>
        {selectedIds.length > 0 &&
          hasPermission(PERMISSIONS.PURCHASE_ORDERS_DELETE) && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="btn btn-danger"
            >
              <Trash2 className="w-4 h-4" /> {t("common.delete")} (
              {selectedIds.length})
            </button>
          )}
      </div>

      {/* ── Stats Widgets ── */}
      {!isLoading && orders.length > 0 && (
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
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-value">{formatCurrency(stats.grandTotal)}</p>
              <p className="stat-label">{t("purchaseOrders.stats.grandTotal")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-value">{formatCurrency(stats.maxTotal)}</p>
              <p className="stat-label">{t("purchaseOrders.stats.maxTotal")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-value">{stats.completed}</p>
              <p className="stat-label">{t("purchaseOrders.stats.completed")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-value">{stats.sent}</p>
              <p className="stat-label">{t("purchaseOrders.stats.sent")}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar: Search + Filter + Create + View Toggle ── */}
      <div className="card">
        <div className="card-body" style={{ padding: ".75rem 1.25rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".75rem",
              flexWrap: "wrap",
            }}
          >
            {/* Left: PO Search */}
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "0 .75rem",
                }}
              >
                <Search
                  className="w-4 h-4"
                  style={{ color: "var(--text-muted)", flexShrink: 0 }}
                />
                <input
                  type="text"
                  placeholder={t("purchaseOrders.searchPo")}
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    padding: ".5rem .625rem",
                    fontSize: ".875rem",
                    color: "var(--text-primary)",
                    minWidth: 0,
                  }}
                />
              </div>
            </div>

            {/* Right: Filter + Clear + Create + View Toggle */}
            <div style={{ flex: 1, display: "flex", gap: ".5rem", alignItems: "center", justifyContent: "flex-end", minWidth: "fit-content" }}>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-ghost"
                style={{ fontSize: ".8125rem" }}
              >
                <Filter className="w-4 h-4" />
                {t("common.filter")}
                {(appliedFilters.supplier_id ||
                  appliedFilters.product_id ||
                  appliedFilters.date_from ||
                  appliedFilters.date_to) && (
                  <span
                    className="badge badge-info"
                    style={{ marginLeft: ".25rem", fontSize: ".6875rem" }}
                  >
                    {
                      [
                        appliedFilters.supplier_id,
                        appliedFilters.product_id,
                        appliedFilters.date_from,
                        appliedFilters.date_to,
                      ].filter(Boolean).length
                    }
                  </span>
                )}
              </button>
              {(appliedFilters.supplier_id ||
                appliedFilters.product_id ||
                appliedFilters.date_from ||
                appliedFilters.date_to) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters({
                      supplier_id: "",
                      product_id: "",
                      date_from: "",
                      date_to: "",
                    });
                    setAppliedFilters({
                      supplier_id: "",
                      product_id: "",
                      date_from: "",
                      date_to: "",
                    });
                  }}
                  className="btn btn-ghost"
                  style={{ fontSize: ".8125rem", color: "var(--danger)" }}
                >
                  <X className="w-4 h-4" />
                  {t("common.clear")}
                </button>
              )}
              {hasPermission(PERMISSIONS.PURCHASE_ORDERS_CREATE) && (
                <button
                  onClick={() => setShowModal(true)}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4" /> {t("purchaseOrders.add")}
                </button>
              )}
              {orders.length > 0 && (
                <div style={{ display: "flex", gap: ".25rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const data = orders.map((o: any) => ({
                        [t("purchaseOrders.table.poNumber")]: o.po_number,
                        [t("purchaseOrders.table.supplier")]: o.suppliers?.map((s: any) => s.name).join(", ") || "",
                        [t("purchaseOrders.table.total")]: o.total,
                        [t("purchaseOrders.table.status")]: o.status,
                        [t("purchaseOrders.table.date")]: o.created_at,
                      }));
                      exportCSV(data, "purchase-orders");
                    }}
                    className="btn btn-ghost"
                    style={{ fontSize: ".8125rem" }}
                    title="Export CSV" aria-label="Export CSV"
                  >
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const data = orders.map((o: any) => ({
                        [t("purchaseOrders.table.poNumber")]: o.po_number,
                        [t("purchaseOrders.table.supplier")]: o.suppliers?.map((s: any) => s.name).join(", ") || "",
                        [t("purchaseOrders.table.total")]: o.total,
                        [t("purchaseOrders.table.status")]: o.status,
                        [t("purchaseOrders.table.date")]: o.created_at,
                      }));
                      exportXLSX(data, "purchase-orders");
                    }}
                    className="btn btn-ghost"
                    style={{ fontSize: ".8125rem" }}
                    title="Export XLSX" aria-label="Export XLSX"
                  >
                    <Download className="w-4 h-4" /> XLSX
                  </button>
                </div>
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
                  style={
                    viewMode === "list"
                      ? {
                          background: "var(--bg-card)",
                          boxShadow: "var(--shadow-sm)",
                        }
                      : {}
                  }
                  onClick={() => setViewMode("list")}
                  title="List View" aria-label="List View" aria-pressed={viewMode === "list"}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className={`btn-icon ${viewMode === "grid" ? "active" : ""}`}
                  style={
                    viewMode === "grid"
                      ? {
                          background: "var(--bg-card)",
                          boxShadow: "var(--shadow-sm)",
                        }
                      : {}
                  }
                  onClick={() => setViewMode("grid")}
                  title="Grid View" aria-label="Grid View" aria-pressed={viewMode === "grid"}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          {showFilters && (
            <div
              style={{
                display: "flex",
                gap: ".75rem",
                flexWrap: "wrap",
                marginTop: ".75rem",
                paddingTop: ".75rem",
                borderTop: "1px solid var(--border)",
              }}
            >
              <SearchSelect
                label={t("purchaseOrders.table.supplier")}
                options={suppliers}
                value={filters.supplier_id}
                onChange={(v) => setFilters({ ...filters, supplier_id: v })}
                placeholder={t("purchaseOrders.form.supplierPlaceholder")}
              />
              <SearchSelect
                label={t("purchaseOrders.table.product")}
                options={products}
                value={filters.product_id}
                onChange={(v) => setFilters({ ...filters, product_id: v })}
                placeholder={t("purchaseOrders.form.productPlaceholder")}
              />
              <div className="form-group" style={{ minWidth: "140px" }}>
                <label className="form-label">{t("common.from")}</label>
                <input
                  type="date"
                  name="date_from"
                  autoComplete="off"
                  value={filters.date_from}
                  onChange={(e) =>
                    setFilters({ ...filters, date_from: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ minWidth: "140px" }}>
                <label className="form-label">{t("common.to")}</label>
                <input
                  type="date"
                  name="date_to"
                  autoComplete="off"
                  value={filters.date_to}
                  onChange={(e) =>
                    setFilters({ ...filters, date_to: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: ".5rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setAppliedFilters({ ...filters })}
                  className="btn btn-primary"
                  style={{ fontSize: ".8125rem" }}
                >
                  <Search className="w-4 h-4" />
                  {t("common.search")}
                </button>
              </div>
            </div>
          )}
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
                        filteredOrders.length > 0 &&
                        selectedIds.length === filteredOrders.length
                      }
                      ref={(input) => {
                        if (input) {
                          input.indeterminate =
                            selectedIds.length > 0 &&
                            selectedIds.length < filteredOrders.length;
                        }
                      }}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      style={{ accentColor: "var(--accent)" }} aria-label="Select all purchase orders"
                    />
                  </th>
                  <th>{t("purchaseOrders.table.poNumber")}</th>
                  <th>{t("purchaseOrders.table.supplier")}</th>
                  <th className="right">{t("purchaseOrders.table.total")}</th>
                  <th className="center">{t("purchaseOrders.table.status")}</th>
                  <th>{t("purchaseOrders.table.date")}</th>
                  <th className="right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      {t("purchaseOrders.loading")}
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      <Package
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          margin: "0 auto .75rem",
                          opacity: 0.3,
                        }}
                      />
                      <p>{t("purchaseOrders.empty")}</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((po: any) => (
                    <tr
                      key={po.id}
                      style={
                        selectedIds.includes(po.id)
                          ? { background: "var(--accent-light)" }
                          : {}
                      }
                    >
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(po.id)}
                          onChange={() => toggleSelect(po.id)}
                          style={{ accentColor: "var(--accent)" }} aria-label={`Select ${po.po_number}`}
                        />
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: ".8rem",
                            fontWeight: 500,
                            color: "var(--accent)",
                          }}
                        >
                          {po.po_number}
                        </span>
                      </td>
                      <td>
                        {po.suppliers && po.suppliers.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: ".25rem",
                            }}
                          >
                            {po.suppliers.map((s: any) => (
                              <span key={s.id} className="badge badge-gray">
                                {s.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="right" style={{ fontWeight: 600 }}>
                        {formatCurrency(po.total)}
                      </td>
                      <td className="center">
                        <span
                          className={`badge ${STATUS_BADGE[po.status] ?? "badge-gray"}`}
                          style={{ textTransform: "capitalize" }}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="muted" style={{ fontSize: ".8rem" }}>
                        {formatDate(po.created_at)}
                      </td>
                      <td className="right">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: ".25rem",
                          }}
                        >
                          <button
                            onClick={() => navigate(`/purchase-orders/${po.id}`)}
                            className="btn-icon"
                            title={t("purchaseOrders.detail")} aria-label={t("purchaseOrders.detail")}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {po.status === "draft" &&
                            hasPermission(PERMISSIONS.PURCHASE_ORDERS_EDIT) && (
                              <button
                                onClick={() => sendMutation.mutate(po.id)}
                                className="btn-icon edit"
                                title={t("purchaseOrders.send")} aria-label={t("purchaseOrders.send")}
                              >
                                <Truck className="w-4 h-4" />
                              </button>
                            )}
                          {(po.status === "sent" || po.status === "partial") &&
                            hasPermission(PERMISSIONS.PURCHASE_ORDERS_EDIT) && (
                              <button
                                onClick={() => setReceiveConfirmId(po.id)}
                                className="btn-icon"
                                title={t("purchaseOrders.receive")}
                                style={{ color: "var(--success)" }} aria-label={t("purchaseOrders.receive")}
                              >
                                <Send className="w-4 h-4" />
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
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {isLoading ? (
            <div
              className="table-empty"
              style={{
                gridColumn: "1 / -1",
                background: "var(--bg-card)",
                borderRadius: "var(--radius)",
              }}
            >
              {t("common.loading")}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              className="table-empty"
              style={{
                gridColumn: "1 / -1",
                background: "var(--bg-card)",
                borderRadius: "var(--radius)",
              }}
            >
              <Package
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  margin: "0 auto .75rem",
                  opacity: 0.3,
                }}
              />
              <p>{t("purchaseOrders.empty")}</p>
            </div>
          ) : (
            filteredOrders.map((po: any) => (
              <div
                key={po.id}
                className="card"
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  transition: "box-shadow .2s, transform .2s",
                  border: selectedIds.includes(po.id)
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
                  boxShadow: selectedIds.includes(po.id)
                    ? "0 0 0 1px var(--accent)"
                    : "var(--shadow-sm)",
                }}
                onMouseEnter={(e) => {
                  if (!selectedIds.includes(po.id)) {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "var(--shadow-md)";
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedIds.includes(po.id)) {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "var(--shadow-sm)";
                    (e.currentTarget as HTMLElement).style.transform = "";
                  }
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    zIndex: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(po.id)}
                    onChange={() => toggleSelect(po.id)}
                    style={{
                      accentColor: "var(--accent)",
                      width: "1.25rem",
                      height: "1.25rem",
                      cursor: "pointer",
                    }} aria-label={`Select ${po.po_number}`}
                  />
                </div>
                <div
                  className="card-body"
                  style={{ flex: 1, padding: "1.25rem" }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: ".75rem",
                      alignItems: "flex-start",
                      paddingRight: "2rem",
                    }}
                  >
                    <div className="stat-icon" style={{ flexShrink: 0 }}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginBottom: ".25rem",
                          fontFamily: "monospace",
                          fontSize: "1rem",
                        }}
                      >
                        {po.po_number}
                      </h3>
                      <div
                        style={{
                          fontSize: ".8125rem",
                          color: "var(--text-secondary)",
                          lineHeight: 1.4,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: ".25rem",
                        }}
                      >
                        {po.suppliers && po.suppliers.length > 0
                          ? po.suppliers.map((s: any) => (
                              <span key={s.id} className="badge badge-gray">
                                {s.name}
                              </span>
                            ))
                          : "—"}
                      </div>
                      <p
                        style={{
                          fontSize: ".8125rem",
                          color: "var(--text-muted)",
                          marginTop: ".2rem",
                        }}
                      >
                        {formatDate(po.created_at)}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      className={`badge ${STATUS_BADGE[po.status] ?? "badge-gray"}`}
                      style={{ textTransform: "capitalize" }}
                    >
                      {po.status}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontSize: "1.125rem",
                      }}
                    >
                      {formatCurrency(po.total)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.75rem 1.25rem",
                    borderTop: "1px solid var(--border)",
                    background: "var(--bg-hover)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "0.5rem",
                    borderBottomLeftRadius: "var(--radius)",
                    borderBottomRightRadius: "var(--radius)",
                  }}
                >
                  <button
                    onClick={() => navigate(`/purchase-orders/${po.id}`)}
                    className="btn-icon"
                    title={t("purchaseOrders.detail")} aria-label={t("purchaseOrders.detail")}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {po.status === "draft" &&
                    hasPermission(PERMISSIONS.PURCHASE_ORDERS_EDIT) && (
                      <button
                        onClick={() => sendMutation.mutate(po.id)}
                        className="btn-icon edit"
                        title={t("purchaseOrders.send")} aria-label={t("purchaseOrders.send")}
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    )}
                  {(po.status === "sent" || po.status === "partial") &&
                    hasPermission(PERMISSIONS.PURCHASE_ORDERS_EDIT) && (
                      <button
                        onClick={() => setReceiveConfirmId(po.id)}
                        className="btn-icon"
                        title={t("purchaseOrders.receive")}
                        style={{ color: "var(--success)" }} aria-label={t("purchaseOrders.receive")}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                </div>
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
              {bulkDeleteMutation.isPending
                ? t("common.loading")
                : t("common.delete")}
            </button>
          </>
        }
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "1rem 0",
          }}
        >
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
          <p
            style={{
              fontWeight: 600,
              fontSize: "1.0625rem",
              color: "var(--text-primary)",
              marginBottom: "0.5rem",
            }}
          >
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
        title={t("purchaseOrders.createTitle")}
        size="lg"
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
              form="po-form"
              disabled={saveMutation.isPending}
              className="btn btn-primary"
            >
              {saveMutation.isPending
                ? t("common.saving")
                : t("purchaseOrders.add")}
            </button>
          </>
        }
      >
        <form
          id="po-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="flex flex-col gap-5"
        >
          <div className="form-group">
            <label className="form-label">
              {t("purchaseOrders.form.supplier")}
            </label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: ".5rem",
                padding: ".5rem .75rem",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: ".5rem",
                minHeight: "2.5rem",
              }}
            >
              {suppliers.length === 0 ? (
                <span
                  style={{ fontSize: ".875rem", color: "var(--text-muted)" }}
                >
                  {t("common.loading")}
                </span>
              ) : (
                suppliers.map((s) => {
                  const selected = form.supplier_ids.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: ".375rem",
                        padding: ".25rem .625rem",
                        borderRadius: "999px",
                        fontSize: ".8125rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        background: selected
                          ? "var(--accent-light)"
                          : "var(--bg-card)",
                        border: selected
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                        color: selected
                          ? "var(--accent)"
                          : "var(--text-secondary)",
                        transition: "all .15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          setForm({
                            ...form,
                            supplier_ids: selected
                              ? form.supplier_ids.filter((id) => id !== s.id)
                              : [...form.supplier_ids, s.id],
                          });
                        }}
                        style={{ accentColor: "var(--accent)", margin: 0 }}
                      />
                      {s.name}
                    </label>
                  );
                })
              )}
            </div>
            {form.supplier_ids.length === 0 && (
              <span
                style={{
                  fontSize: ".75rem",
                  color: "var(--text-muted)",
                  marginTop: ".25rem",
                }}
              >
                {t("purchaseOrders.form.supplierPlaceholder")}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-primary">
                {t("purchaseOrders.table.items")}
              </label>
            </div>

            <div className="flex flex-col gap-3">
              {form.items.map((item, i) => (
                <div
                  key={i}
                  className="p-4 bg-card border border-(--border) rounded-xl flex flex-col gap-3 relative"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                      {t("purchaseOrders.form.itemPrefix")} {i + 1}
                    </span>
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            items: form.items.filter((_, j) => j !== i),
                          })
                        }
                        className="text-xs font-bold text-danger hover:underline"
                      >
                        {t("purchaseOrders.form.remove")}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-group md:col-span-2">
                      <SearchSelect
                        options={products}
                        value={item.product_id}
                        onChange={(v) => {
                          const items = [...form.items];
                          items[i] = { ...items[i], product_id: v };
                          const p = products.find((p) => p.id === Number(v));
                          if (p) items[i].price = p.buy_price;
                          setForm({ ...form, items });
                        }}
                        placeholder={t(
                          "purchaseOrders.form.productPlaceholder",
                        )}
                      />
                    </div>

                    <div className="form-group">
                      <label className="text-xs text-secondary mb-1">Qty</label>
                      <input
                        type="number"
                        required
                        min={1}
                        name="qty"
                        autoComplete="off"
                        placeholder={t("purchaseOrders.form.qtyPlaceholder")}
                        value={item.qty}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i].qty = Number(e.target.value);
                          setForm({ ...form, items });
                        }}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="text-xs text-secondary mb-1">
                        {t("purchaseOrders.table.price")}
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        name="price"
                        autoComplete="off"
                        placeholder={t("purchaseOrders.form.pricePlaceholder")}
                        value={item.price}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i].price = Number(e.target.value);
                          setForm({ ...form, items });
                        }}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  items: [...form.items, { product_id: "", qty: 1, price: 0 }],
                })
              }
              className="w-full p-3 border-2 border-dashed border-(--border) rounded-xl text-sm font-medium text-secondary hover:text-primary hover:border-primary transition-all bg-transparent"
            >
              + {t("purchaseOrders.form.addItem")}
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">
              {t("purchaseOrders.form.notes")}
            </label>
            <textarea
              name="notes"
              autoComplete="off"
              placeholder={t("purchaseOrders.form.notesPlaceholder")}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="form-input"
              rows={2}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={receiveConfirmId !== null}
        onClose={() => setReceiveConfirmId(null)}
        onConfirm={() => {
          if (receiveConfirmId !== null) {
            receiveMutation.mutate(receiveConfirmId);
          }
        }}
        title={t("purchaseOrders.receive")}
        message={t("purchaseOrders.receiveConfirm")}
        confirmLabel={t("purchaseOrders.receiveButton")}
        cancelLabel={t("common.cancel")}
        variant="primary"
        loading={receiveMutation.isPending}
      />
    </div>
  );
}
