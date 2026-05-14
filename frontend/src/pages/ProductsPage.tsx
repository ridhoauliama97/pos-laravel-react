import { useState } from "react";
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
  Package,
  LayoutGrid,
  List,
  AlertTriangle,
  Upload,
  X,
  PackageCheck,
  PackagePlus,
  AlertCircle,
} from "lucide-react";
import type { Product } from "../types";
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

export default function ProductsPage() {
  const t = useT();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    category_id: "",
    unit_id: "",
    buy_price: 0,
    sell_price: 0,
    min_stock: 0,
    is_active: true,
    variants: [] as {
      name: string;
      sku: string;
      buy_price: number;
      sell_price: number;
      stock: number;
    }[],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", search, page, statusFilter, stockFilter],
    queryFn: () => {
      const params = new URLSearchParams({ search, page: String(page) });
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

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<any[]>("/categories?per_page=100"),
  });

  const { data: unitsData } = useQuery({
    queryKey: ["units"],
    queryFn: () => api.get<any[]>("/units"),
  });

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

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const hasFile = !!imageFile;

      if (hasFile) {
        const fd = new FormData();
        fd.append("name", data.name);
        fd.append("buy_price", String(data.buy_price));
        fd.append("sell_price", String(data.sell_price));
        fd.append("min_stock", String(data.min_stock));
        fd.append("is_active", data.is_active ? "1" : "0");

        if (data.sku) fd.append("sku", data.sku);
        if (data.barcode) fd.append("barcode", data.barcode);
        if (data.category_id) fd.append("category_id", String(data.category_id));
        if (data.unit_id) fd.append("unit_id", String(data.unit_id));
        if (data.min_stock > 0) fd.append("min_stock", String(data.min_stock));
        fd.append("image", imageFile!);
        if (data.variants.length > 0) {
          fd.append("variants", JSON.stringify(data.variants));
        }

        const endpoint = editingId ? `/products/${editingId}` : "/products";
        if (editingId) {
          fd.append("_method", "PUT");
        }
        return api.upload<Product>(endpoint, fd);
      }

      const payload = {
        ...data,
        category_id: data.category_id ? Number(data.category_id) : null,
        unit_id: data.unit_id ? Number(data.unit_id) : null,
      } as Record<string, unknown>;

      if (editingId && !imagePreview && imageFile === null) {
        payload.image = "";
      }

      return editingId
        ? api.put<Product>(`/products/${editingId}`, payload)
        : api.post<Product>("/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-stats"] });
      setShowModal(false);
      setEditingId(null);
      resetForm();
      toast.success(editingId ? t("products.updated") : t("products.created"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const products = data?.data || [];
  const meta = data?.meta;
  const categories = categoriesData?.data || [];
  const units = unitsData?.data || [];

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

  const resetForm = () => {
    setForm({
      name: "",
      sku: "",
      barcode: "",
      category_id: "",
      unit_id: "",
      buy_price: 0,
      sell_price: 0,
      min_stock: 0,
      is_active: true,
      variants: [],
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      category_id: String(product.category_id || ""),
      unit_id: String(product.unit_id || ""),
      buy_price: product.buy_price,
      sell_price: product.sell_price,
      min_stock: product.min_stock,
      is_active: product.is_active,
      variants:
        product.variants?.map((v) => ({
          name: v.name,
          sku: v.sku || "",
          buy_price: v.buy_price,
          sell_price: v.sell_price,
          stock: v.stock,
        })) || [],
    });
    setImageFile(null);
    setImagePreview(product.image || null);
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
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
            onClick={() => {
              setEditingId(null);
              resetForm();
              setShowModal(true);
            }}
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
            <option value="">{t("products.filters.allStatus")}</option>
            <option value="1">{t("products.filters.active")}</option>
            <option value="0">{t("products.filters.inactive")}</option>
          </select>

          <select
            value={stockFilter}
            onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
            className="form-select"
            style={{ width: "auto", fontSize: ".8125rem", padding: ".35rem .75rem" }}
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
            <button
              onClick={() => setViewMode("list")}
              className={`btn-icon ${viewMode === "list" ? "active" : ""}`}
              style={{
                background: viewMode === "list" ? "var(--bg-card)" : "transparent",
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
                background: viewMode === "grid" ? "var(--bg-card)" : "transparent",
                boxShadow: viewMode === "grid" ? "var(--shadow-sm)" : "none",
              }}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Content */}
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
                      className="form-checkbox"
                    />
                  </th>
                  <th style={{ width: "4rem" }}>{t("products.table.image")}</th>
                  <th>{t("products.table.name")}</th>
                  <th>{t("products.table.sku")}</th>
                  <th>{t("products.table.barcode")}</th>
                  <th>{t("products.table.category")}</th>
                  <th>{t("products.table.unit")}</th>
                  <th className="right">{t("products.table.buyPrice")}</th>
                  <th className="right">{t("products.table.sellPrice")}</th>
                  <th className="right">{t("products.table.stock")}</th>
                  <th className="center">{t("common.status")}</th>
                  <th className="right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="table-empty">
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
                    <td colSpan={12} className="table-empty">
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
                            className="form-checkbox"
                          />
                        </td>
                        <td>
                          {product.image ? (
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
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                            {product.name}
                          </span>
                        </td>
                        <td className="muted">
                          <span style={{ fontFamily: "monospace", fontSize: ".8rem" }}>
                            {product.sku || "—"}
                          </span>
                        </td>
                        <td className="muted">
                          <span style={{ fontFamily: "monospace", fontSize: ".8rem" }}>
                            {product.barcode || "—"}
                          </span>
                        </td>
                        <td className="muted">{product.category?.name || "—"}</td>
                        <td className="muted">{product.unit?.name || "—"}</td>
                        <td className="right muted">
                          {formatCurrency(product.buy_price)}
                        </td>
                        <td className="right">
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {formatCurrency(product.sell_price)}
                          </span>
                        </td>
                        <td className="right">
                          <span
                            style={{
                              fontWeight: 600,
                              color: totalStock === 0 ? "#ef4444" : isLow ? "#f59e0b" : "var(--text-primary)",
                            }}
                          >
                            {totalStock}
                          </span>
                          {totalStock === 0 && (
                            <span
                              className="badge badge-danger"
                              style={{ marginLeft: ".4rem", fontSize: ".65rem" }}
                            >
                              {t("products.inactive")}
                            </span>
                          )}
                          {totalStock > 0 && isLow && (
                            <span
                              className="badge"
                              style={{ marginLeft: ".4rem", fontSize: ".65rem", background: "#f59e0b", color: "#fff" }}
                            >
                              {t("products.low")}
                            </span>
                          )}
                        </td>
                        <td className="center">
                          <span
                            className={`badge ${product.is_active ? "badge-success" : "badge-danger"}`}
                          >
                            {product.is_active ? t("common.active") : t("products.inactive")}
                          </span>
                        </td>
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
                                title={t("common.edit")}
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
                                title={t("common.delete")}
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
                      style={{ width: "1.25rem", height: "1.25rem" }}
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
                      <button onClick={() => openEdit(product)} className="btn-icon edit" title={t("common.edit")}>
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
                        title={t("common.delete")}
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
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="page-nav">
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
            <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="page-nav">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? t("products.editTitle") : t("products.addTitle")}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">
              {t("common.cancel")}
            </button>
            <button type="submit" form="product-form" disabled={saveMutation.isPending} className="btn btn-primary">
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
          </>
        }
      >
        <form
          id="product-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="flex flex-col gap-4"
        >
          <div className="form-group">
            <label className="form-label">{t("products.form.productImage")}</label>
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: "6rem",
                  height: "6rem",
                  borderRadius: "0.75rem",
                  border: "2px dashed var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                  background: "var(--bg)",
                  flexShrink: 0,
                }}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      style={{
                        position: "absolute",
                        top: "0.25rem",
                        right: "0.25rem",
                        width: "1.5rem",
                        height: "1.5rem",
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <Package className="w-8 h-8" style={{ opacity: 0.3 }} />
                )}
              </div>
              <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
                <Upload className="w-4 h-4" />
                {imagePreview ? t("common.change") : t("common.chooseFile")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
              cursor: "pointer",
              fontSize: ".875rem",
              color: "var(--text-primary)",
              padding: ".5rem 0",
            }}
          >
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="form-checkbox"
              style={{ width: "1.125rem", height: "1.125rem" }}
            />
            {t("products.form.isActive")}
          </label>

          <div className="form-group">
            <label className="form-label">{t("products.form.productName")}</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
              placeholder={t("products.form.productNamePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">{t("products.form.sku")}</label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="form-input"
                placeholder={t("products.form.skuPlaceholder")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("products.form.barcode")}</label>
              <input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                className="form-input"
                placeholder="123456789"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">{t("products.form.category")}</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="form-select"
              >
                <option value="">{t("products.form.categoryPlaceholder")}</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t("products.form.unit")}</label>
              <select
                value={form.unit_id}
                onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                className="form-select"
              >
                <option value="">{t("products.form.unitPlaceholder")}</option>
                {units.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">{t("products.form.buyPrice")}</label>
              <input
                type="number"
                required
                value={form.buy_price}
                onChange={(e) => setForm({ ...form, buy_price: Number(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("products.form.sellPrice")}</label>
              <input
                type="number"
                required
                value={form.sell_price}
                onChange={(e) => setForm({ ...form, sell_price: Number(e.target.value) })}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t("products.form.minStock")}</label>
            <input
              type="number"
              value={form.min_stock}
              onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
              className="form-input"
            />
          </div>
        </form>
      </Modal>

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
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
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
