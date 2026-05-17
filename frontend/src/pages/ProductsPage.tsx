import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatCurrency, formatDate } from "../lib/utils";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  LayoutGrid,
  List,
  AlertTriangle,
  PackageCheck,
  PackagePlus,
  AlertCircle,
  Columns,
} from "../components/icons";
import type { Product, Category } from "../types";
import { useT } from "../i18n";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { Modal } from "../components/Modal";

interface ProductStats {
  total: number;
  active: number;
  ready_stock: number;
  low_stock: number;
}

type ColumnKey = "image" | "name" | "sku" | "barcode" | "category" | "unit" | "buyPrice" | "sellPrice" | "stock" | "status" | "createdAt";
type ColumnAlign = "left" | "right" | "center";

interface ColumnDef {
  key: ColumnKey;
  labelKey: string;
  align?: ColumnAlign;
  minWidth: number;
  optional?: boolean;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: "image", labelKey: "products.table.image", minWidth: 72 },
  { key: "name", labelKey: "products.table.name", minWidth: 140 },
  { key: "sku", labelKey: "products.table.sku", minWidth: 96 },
  { key: "barcode", labelKey: "products.table.barcode", minWidth: 108 },
  { key: "category", labelKey: "products.table.category", minWidth: 108 },
  { key: "unit", labelKey: "products.table.unit", minWidth: 80 },
  { key: "buyPrice", labelKey: "products.table.buyPrice", align: "right", minWidth: 104 },
  { key: "sellPrice", labelKey: "products.table.sellPrice", align: "right", minWidth: 104 },
  { key: "stock", labelKey: "products.table.stock", align: "right", minWidth: 96 },
  { key: "status", labelKey: "common.status", align: "center", minWidth: 96 },
  { key: "createdAt", labelKey: "products.table.createdAt", align: "center", minWidth: 128, optional: true },
];

const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = COLUMN_DEFS.filter((c) => !c.optional).map((c) => c.key);
const VISIBLE_COLUMNS_STORAGE_KEY = "pos-products-visible-columns";

function sortColumnKeys(keys: ColumnKey[]): ColumnKey[] {
  const set = new Set(keys);
  return COLUMN_DEFS.map((c) => c.key).filter((k) => set.has(k));
}

function loadVisibleColumns(): ColumnKey[] {
  try {
    const raw = localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_COLUMNS;
    const valid = parsed.filter((k): k is ColumnKey =>
      COLUMN_DEFS.some((c) => c.key === k)
    );
    const sorted = sortColumnKeys(valid);
    return sorted.length > 0 ? sorted : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

function thClass(align?: ColumnAlign): string {
  if (align === "right") return "right";
  if (align === "center") return "center";
  return "";
}

function tdClass(align?: ColumnAlign, extra?: string): string {
  const parts: string[] = [];
  if (align === "right") parts.push("right");
  if (align === "center") parts.push("center");
  if (extra) parts.push(extra);
  return parts.join(" ");
}

const MUTED_COLUMNS = new Set<ColumnKey>(["sku", "barcode", "category", "unit", "buyPrice", "createdAt"]);

export default function ProductsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");

  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(loadVisibleColumns);

  const queryClient = useQueryClient();

  const activeColumns = useMemo(
    () => COLUMN_DEFS.filter((c) => visibleColumns.includes(c.key)),
    [visibleColumns]
  );

  const tableColSpan = activeColumns.length + 2;
  const tableMinWidth = useMemo(
    () => 48 + activeColumns.reduce((sum, col) => sum + col.minWidth, 0) + 96,
    [activeColumns]
  );

  const mainColumnDefs = useMemo(() => COLUMN_DEFS.filter((c) => !c.optional), []);
  const optionalColumnDefs = useMemo(() => COLUMN_DEFS.filter((c) => c.optional), []);

  useEffect(() => {
    localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    if (!showColumnPicker) return;
    const onPointerDown = (event: MouseEvent) => {
      if (columnPickerRef.current?.contains(event.target as Node)) return;
      setShowColumnPicker(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showColumnPicker]);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });
  const categories = categoriesData?.data || [];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", search, page, categoryFilter, statusFilter, stockFilter],
    queryFn: () => {
      const params = new URLSearchParams({ search, page: String(page) });
      if (categoryFilter) params.set("category_id", categoryFilter);
      if (statusFilter) params.set("is_active", statusFilter);
      if (stockFilter) params.set("stock_status", stockFilter);
      return api.get<Product[]>(`/products?${params}`);
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["products-stats"],
    queryFn: () => api.get<ProductStats>("/products/stats"),
  });

  const stats = statsData?.data;

  const toggleColumn = useCallback((key: ColumnKey) => {
    setVisibleColumns((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        if (!next.includes("name")) return prev;
        return sortColumnKeys(next);
      }
      return sortColumnKeys([...prev, key]);
    });
  }, []);

  const renderColumnCell = (key: ColumnKey, product: Product, totalStock: number, isLow: boolean) => {
    switch (key) {
      case "image":
        return product.image ? (
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: "2.5rem",
              height: "2.5rem",
              objectFit: "cover",
              borderRadius: "0.375rem",
              border: "1px solid var(--border)",
            }}
          />
        ) : (
          <div
            style={{
              width: "2.5rem",
              height: "2.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-hover)",
              borderRadius: "0.375rem",
              color: "var(--text-muted)",
            }}
          >
            <Package style={{ width: "1.25rem", height: "1.25rem" }} />
          </div>
        );
      case "name":
        return (
          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
            {product.name}
          </span>
        );
      case "sku":
        return (
          <span style={{ fontFamily: "monospace", fontSize: ".8rem" }}>
            {product.sku || "—"}
          </span>
        );
      case "barcode":
        return (
          <span style={{ fontFamily: "monospace", fontSize: ".8rem" }}>
            {product.barcode || "—"}
          </span>
        );
      case "category":
        return product.category?.name || "—";
      case "unit":
        return product.unit?.name || "—";
      case "buyPrice":
        return formatCurrency(product.buy_price);
      case "sellPrice":
        return (
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {formatCurrency(product.sell_price)}
          </span>
        );
      case "stock":
        return (
          <>
            <span
              style={{
                fontWeight: 600,
                color: totalStock === 0 ? "#ef4444" : isLow ? "#f59e0b" : "var(--text-primary)",
              }}
            >
              {totalStock}
            </span>
            {totalStock === 0 && (
              <span className="badge badge-danger" style={{ marginLeft: ".4rem", fontSize: ".65rem" }}>
                {t("products.inactive")}
              </span>
            )}
            {totalStock > 0 && isLow && (
              <span className="badge" style={{ marginLeft: ".4rem", fontSize: ".65rem", background: "#f59e0b", color: "#fff" }}>
                {t("products.low")}
              </span>
            )}
          </>
        );
      case "status":
        return (
          <span className={`badge ${product.is_active ? "badge-success" : "badge-danger"}`}>
            {product.is_active ? t("common.active") : t("products.inactive")}
          </span>
        );
      case "createdAt":
        return formatDate(product.created_at);
      default:
        return null;
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.delete(`/products/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-stats"] });
      toast.success(t("products.deleted"));
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setShowBulkDeleteModal(false);
    },
  });

  const products = data?.data || [];
  const meta = data?.meta;

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length && products.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const openEdit = (product: Product) => {
    navigate(`/products/${product.id}/edit`);
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
          <h1 className="page-title">{t("products.title")}</h1>
          <p className="page-subtitle">{t("products.subtitle")}</p>
        </div>
        {hasPermission(PERMISSIONS.PRODUCTS_CREATE) && (
          <button
            onClick={() => navigate("/products/new")}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> {t("products.add")}
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
            <Package className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <div>
              <p className="stat-value">{stats.total}</p>
              <p className="stat-label">{t("products.stats.total")}</p>
            </div>
          </div>
          <div className="stat-card">
            <PackageCheck className="w-5 h-5" style={{ color: "#22c55e" }} />
            <div>
              <p className="stat-value">{stats.active}</p>
              <p className="stat-label">{t("products.stats.active")}</p>
            </div>
          </div>
          <div className="stat-card">
            <PackagePlus className="w-5 h-5" style={{ color: "#3b82f6" }} />
            <div>
              <p className="stat-value">{stats.ready_stock}</p>
              <p className="stat-label">{t("products.stats.ready")}</p>
            </div>
          </div>
          <div className="stat-card">
            <AlertCircle className="w-5 h-5" style={{ color: "#f59e0b" }} />
            <div>
              <p className="stat-value">{stats.low_stock}</p>
              <p className="stat-label">{t("products.stats.low")}</p>
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
            placeholder={t("products.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="search-input" aria-label={t("products.searchPlaceholder")}
          />
        </div>

        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="form-select"
            style={{ width: "auto", fontSize: ".8125rem", padding: ".35rem 1.75rem .35rem .75rem" }} aria-label={t("products.filters.allCategories")}
          >
            <option value="">{t("products.filters.allCategories")}</option>
            {categories.map((c: Category) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="form-select"
            style={{ width: "auto", fontSize: ".8125rem", padding: ".35rem 1.75rem .35rem .75rem" }} aria-label={t("products.filters.allStatus")}
          >
            <option value="">{t("products.filters.allStatus")}</option>
            <option value="1">{t("products.filters.active")}</option>
            <option value="0">{t("products.filters.inactive")}</option>
          </select>

          <select
            value={stockFilter}
            onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
            className="form-select"
            style={{ width: "auto", fontSize: ".8125rem", padding: ".35rem .75rem" }} aria-label={t("products.filters.allStock")}
          >
            <option value="">{t("products.filters.allStock")}</option>
            <option value="habis">{t("products.filters.stockHabis")}</option>
            <option value="low">{t("products.filters.stockLow")}</option>
            <option value="ready">{t("products.filters.stockReady")}</option>
          </select>

          {selectedIds.length > 0 && hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
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
            {viewMode === "list" && (
            <div ref={columnPickerRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowColumnPicker((p) => !p)}
                className={`btn-icon ${showColumnPicker ? "active" : ""}`}
                style={{
                  background: showColumnPicker ? "var(--bg-card)" : "transparent",
                  boxShadow: showColumnPicker ? "var(--shadow-sm)" : "none",
                }}
                title={t("products.toggleColumns")}
                aria-label={t("products.toggleColumns")}
                aria-expanded={showColumnPicker}
              >
                <Columns className="w-4 h-4" />
              </button>
              {showColumnPicker && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: "0.375rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.625rem",
                    boxShadow: "var(--shadow-lg)",
                    padding: "0.5rem",
                    minWidth: "12rem",
                    maxHeight: "min(70vh, 24rem)",
                    overflowY: "auto",
                    zIndex: 50,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontSize: ".75rem", fontWeight: 600, color: "var(--muted)", padding: "0.25rem 0.5rem 0.375rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {t("products.columns")}
                  </div>
                  {mainColumnDefs.map((col) => (
                    <label
                      key={col.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.375rem 0.5rem",
                        borderRadius: "0.375rem",
                        cursor: col.key === "name" ? "not-allowed" : "pointer",
                        fontSize: ".8125rem",
                        color: "var(--text)",
                        opacity: col.key === "name" ? 0.7 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        disabled={col.key === "name"}
                        style={{ accentColor: "var(--primary)" }}
                      />
                      {t(col.labelKey)}
                    </label>
                  ))}
                  {optionalColumnDefs.length > 0 && (
                    <>
                      <div style={{ fontSize: ".75rem", fontWeight: 600, color: "var(--muted)", padding: "0.5rem 0.5rem 0.375rem", marginTop: "0.25rem", borderTop: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {t("products.columnsExtra")}
                      </div>
                      {optionalColumnDefs.map((col) => (
                        <label
                          key={col.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.375rem 0.5rem",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: ".8125rem",
                            color: "var(--text)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(col.key)}
                            onChange={() => toggleColumn(col.key)}
                            style={{ accentColor: "var(--primary)" }}
                          />
                          {t(col.labelKey)}
                        </label>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            )}
            <button
              onClick={() => { setViewMode("list"); setShowColumnPicker(false); }}
              className={`btn-icon ${viewMode === "list" ? "active" : ""}`}
              style={{
                background: viewMode === "list" ? "var(--bg-card)" : "transparent",
                boxShadow: viewMode === "list" ? "var(--shadow-sm)" : "none",
              }}
              title="List View" aria-label="List View" aria-pressed={viewMode === "list"}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`btn-icon ${viewMode === "grid" ? "active" : ""}`}
              style={{
                background: viewMode === "grid" ? "var(--bg-card)" : "transparent",
                boxShadow: viewMode === "grid" ? "var(--shadow-sm)" : "none",
              }}
              title="Grid View" aria-label="Grid View" aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Content */}
      {viewMode === "list" ? (
        <div className="table-card">
          <div className="products-table-scroll" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table
              className="products-table"
              style={{ minWidth: tableMinWidth, width: "100%", tableLayout: "auto" }}
            >
              <thead>
                <tr>
                  <th style={{ width: "3rem", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={
                        products.length > 0 &&
                        selectedIds.length === products.length
                      }
                      ref={(input) => {
                        if (input) {
                          input.indeterminate =
                            selectedIds.length > 0 &&
                            selectedIds.length < products.length;
                        }
                      }}
                      onChange={toggleSelectAll}
                      className="form-checkbox" aria-label="Select all products"
                    />
                  </th>
                  {activeColumns.map((col) => (
                    <th
                      key={col.key}
                      className={thClass(col.align)}
                      style={{ minWidth: col.minWidth }}
                    >
                      {t(col.labelKey)}
                    </th>
                  ))}
                  <th className="right" style={{ minWidth: 96, width: 96 }}>
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={tableColSpan} className="table-empty">
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: ".5rem",
                        }}
                      >
                        <div
                          className="skeleton"
                          style={{ width: "3rem", height: "3rem", borderRadius: "50%" }}
                        />
                        <span>{t("products.loading")}</span>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={tableColSpan} className="table-empty">
                      <Package
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          margin: "0 auto .75rem",
                          opacity: 0.3,
                        }}
                      />
                      <p>
                        {t("products.empty")}
                        {search ? ` ${t("products.withKeyword")} "${search}"` : ""}
                      </p>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const totalStock =
                      product.variants?.reduce((s, v) => s + v.stock, 0) ?? 0;
                    const isLow = totalStock <= product.min_stock;
                    return (
                      <tr
                        key={product.id}
                        className={selectedIds.includes(product.id) ? "selected-row" : ""}
                      >
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            className="form-checkbox" aria-label={`Select ${product.name}`}
                          />
                        </td>
                        {activeColumns.map((col) => (
                          <td
                            key={col.key}
                            className={tdClass(col.align, MUTED_COLUMNS.has(col.key) ? "muted" : undefined)}
                            style={
                              col.key === "createdAt"
                                ? { whiteSpace: "nowrap", fontSize: ".8125rem" }
                                : undefined
                            }
                          >
                            {renderColumnCell(col.key, product, totalStock, isLow)}
                          </td>
                        ))}
                        <td className="right">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: ".25rem",
                            }}
                          >
                            {hasPermission(PERMISSIONS.PRODUCTS_EDIT) && (
                                <button
                                  onClick={() => openEdit(product)}
                                  className="btn-icon edit"
                                  title={t("common.edit")} aria-label={t("common.edit")}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
                                <button
                                  onClick={() => {
                                    setEditingId(product.id);
                                    setShowBulkDeleteModal(true);
                                    setSelectedIds([product.id]);
                                  }}
                                  className="btn-icon danger"
                                  title={t("common.delete")} aria-label={t("common.delete")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
              <div className="card card-body" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
                {t("products.loading")}
              </div>
            ) : products.length === 0 ? (
              <div className="card card-body" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
                <Package style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto .75rem", opacity: 0.3 }} />
                <p>
                  {t("products.empty")}
                  {search ? ` "${search}"` : ""}
                </p>
              </div>
            ) : (
              products.map((product) => {
                const totalStock = product.variants?.reduce((s, v) => s + v.stock, 0) ?? 0;
                const isLow = totalStock <= product.min_stock;
                return (
                  <div
                    key={product.id}
                    className={`card ${selectedIds.includes(product.id) ? "selected-card" : ""}`}
                    style={{
                      padding: "1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      border: selectedIds.includes(product.id)
                        ? "2px solid var(--accent)"
                        : "1px solid var(--border)",
                      position: "relative",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 2 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="form-checkbox"
                        style={{ width: "1.25rem", height: "1.25rem" }} aria-label={`Select ${product.name}`}
                      />
                    </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", paddingRight: "2rem" }}>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{
                          width: "3rem",
                          height: "3rem",
                          objectFit: "cover",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--border)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
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
                          flexShrink: 0,
                        }}
                      >
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "0.25rem" }}>
                        {product.name}
                      </h3>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                        <span
                          className={`badge ${product.is_active ? "badge-success" : "badge-danger"}`}
                        >
                          {product.is_active ? t("common.active") : t("products.inactive")}
                        </span>
                        {product.category?.name && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              background: "var(--bg)",
                              padding: "0.125rem 0.5rem",
                              borderRadius: "1rem",
                              border: "1px solid var(--border)",
                            }}
                          >
                            {product.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.875rem" }}>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>SKU</div>
                      <div style={{ fontFamily: "monospace" }}>{product.sku || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Barcode</div>
                      <div style={{ fontFamily: "monospace" }}>{product.barcode || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Buy Price</div>
                      <div>{formatCurrency(product.buy_price)}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Sell Price</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(product.sell_price)}</div>
                    </div>
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "var(--bg)",
                        padding: "0.5rem",
                        borderRadius: "0.5rem",
                        marginTop: "0.5rem",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 500 }}>
                        Total Stock
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "1.125rem",
                            color: totalStock === 0 ? "#ef4444" : isLow ? "#f59e0b" : "var(--text-primary)",
                          }}
                        >
                          {totalStock} {product.unit?.name || ""}
                        </span>
                        {totalStock === 0 && (
                          <span className="badge badge-danger" style={{ fontSize: ".65rem" }}>
                            {t("products.inactive")}
                          </span>
                        )}
                        {totalStock > 0 && isLow && (
                          <span className="badge" style={{ fontSize: ".65rem", background: "#f59e0b", color: "#fff" }}>
                            {t("products.low")}
                          </span>
                        )}
                      </div>
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
                    {hasPermission(PERMISSIONS.PRODUCTS_EDIT) && (
                      <button onClick={() => openEdit(product)} className="btn-icon edit" title={t("common.edit")} aria-label={t("common.edit")}>
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
                      <button
                        onClick={() => {
                          setEditingId(product.id);
                          setShowBulkDeleteModal(true);
                          setSelectedIds([product.id]);
                        }}
                        className="btn-icon danger"
                        title={t("common.delete")} aria-label={t("common.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="table-pagination">
          <span className="page-text">
            {(meta.current_page - 1) * meta.per_page + 1}–
            {Math.min(meta.current_page * meta.per_page, meta.total)} dari {meta.total}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: ".25rem" }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="page-nav" aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: meta.last_page }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === meta.last_page || Math.abs(p - page) <= 2)
              .map((p, i, arr) => (
                <span key={p} style={{ display: "flex", alignItems: "center", gap: ".25rem" }}>
                  {i > 0 && arr[i - 1] !== p - 1 && (
                    <span style={{ padding: "0 .25rem", color: "var(--text-muted)" }}>…</span>
                  )}
                  <button onClick={() => setPage(p)} className={p === page ? "page-current" : "page-default"}>
                    {p}
                  </button>
                </span>
              ))}
            <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="page-nav" aria-label="Next page">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => { setShowBulkDeleteModal(false); setEditingId(null); if (selectedIds.length === 1 && editingId) setSelectedIds([]); }}
        title="Confirm Deletion"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setShowBulkDeleteModal(false); setEditingId(null); if (selectedIds.length === 1 && editingId) setSelectedIds([]); }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              disabled={bulkDeleteMutation.isPending}
              className="btn btn-danger"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Trash2 className="w-4 h-4" />
              {bulkDeleteMutation.isPending ? "Deleting\u2026" : "Delete"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "var(--text-color)" }}>
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
            <h4 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Are you sure?</h4>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              You are about to delete <strong style={{ color: "var(--text-color)" }}>{selectedIds.length}</strong> product(s). This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
