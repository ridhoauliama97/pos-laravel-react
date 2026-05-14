import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatCurrency, formatDate } from "../lib/utils";
import toast from "react-hot-toast";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Send, CheckCircle, Eye, Package, LayoutGrid, List, AlertTriangle, Trash2 } from "lucide-react";
import type { Supplier, Product } from "../types";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { useT } from "../i18n";
import { Modal } from "../components/Modal";

interface POItem {
  product_id: string;
  qty: number;
  price: number;
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
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{
    supplier_id: string;
    notes: string;
    items: POItem[];
  }>({
    supplier_id: "",
    notes: "",
    items: [{ product_id: "", qty: 1, price: 0 }],
  });
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => api.get<any[]>("/purchase-orders"),
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
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
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
        supplier_id: "",
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
  const suppliers = suppliersData?.data || [];
  const products = productsData?.data || [];

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(orders.map((o: any) => o.id));
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
          <h1 className="page-title">{t("purchaseOrders.title")}</h1>
          <p className="page-subtitle">{t("purchaseOrders.subtitle")}</p>
        </div>
        {hasPermission(PERMISSIONS.PURCHASE_ORDERS_CREATE) && (
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
            {selectedIds.length > 0 && hasPermission(PERMISSIONS.PURCHASE_ORDERS_DELETE) && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="btn btn-danger"
              >
                <Trash2 className="w-4 h-4" /> {t("common.delete")} ({selectedIds.length})
              </button>
            )}
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> {t("purchaseOrders.add")}
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
                      checked={orders.length > 0 && selectedIds.length === orders.length}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selectedIds.length > 0 && selectedIds.length < orders.length;
                        }
                      }}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      style={{ accentColor: "var(--accent)" }}
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
              ) : orders.length === 0 ? (
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
                orders.map((po: any) => (
                  <tr key={po.id} style={selectedIds.includes(po.id) ? { background: "var(--accent-light)" } : {}}>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(po.id)}
                        onChange={() => toggleSelect(po.id)}
                        style={{ accentColor: "var(--accent)" }}
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
                    <td className="muted">{po.supplier?.name || "—"}</td>
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
                          justifyContent: "flex-end",
                          gap: ".25rem",
                        }}
                      >
                        <Link
                          to={`/purchase-orders/${po.id}`}
                          className="btn-icon"
                          title={t("purchaseOrders.detail")}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {po.status === "draft" && hasPermission(PERMISSIONS.PURCHASE_ORDERS_EDIT) && (
                          <button
                            onClick={() => sendMutation.mutate(po.id)}
                            className="btn-icon edit"
                            title={t("purchaseOrders.send")}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {(po.status === "sent" || po.status === "partial") && hasPermission(PERMISSIONS.PURCHASE_ORDERS_EDIT) && (
                          <button
                            onClick={() => {
                              if (confirm(t("purchaseOrders.receiveConfirm")))
                                receiveMutation.mutate(po.id);
                            }}
                            className="btn-icon"
                            title={t("purchaseOrders.receive")}
                            style={{ color: "var(--success)" }}
                          >
                            <CheckCircle className="w-4 h-4" />
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
            <div className="table-empty" style={{ gridColumn: "1 / -1", background: "var(--bg-card)", borderRadius: "var(--radius)" }}>
              {t("common.loading")}
            </div>
          ) : orders.length === 0 ? (
            <div className="table-empty" style={{ gridColumn: "1 / -1", background: "var(--bg-card)", borderRadius: "var(--radius)" }}>
              <Package style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto .75rem", opacity: 0.3 }} />
              <p>{t("purchaseOrders.empty")}</p>
            </div>
          ) : (
            orders.map((po: any) => (
              <div
                key={po.id}
                className="card"
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  transition: "box-shadow .2s, transform .2s",
                  border: selectedIds.includes(po.id) ? "1px solid var(--accent)" : "1px solid var(--border)",
                  boxShadow: selectedIds.includes(po.id) ? "0 0 0 1px var(--accent)" : "var(--shadow-sm)",
                }}
                onMouseEnter={(e) => {
                  if (!selectedIds.includes(po.id)) {
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedIds.includes(po.id)) {
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
                    (e.currentTarget as HTMLElement).style.transform = "";
                  }
                }}
              >
                <div style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(po.id)}
                    onChange={() => toggleSelect(po.id)}
                    style={{ accentColor: "var(--accent)", width: "1.25rem", height: "1.25rem", cursor: "pointer" }}
                  />
                </div>
                <div className="card-body" style={{ flex: 1, padding: "1.25rem" }}>
                  <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-start", paddingRight: "2rem" }}>
                    <div className="stat-icon" style={{ flexShrink: 0 }}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: ".25rem", fontFamily: "monospace", fontSize: "1rem" }}>
                        {po.po_number}
                      </h3>
                      <p style={{ fontSize: ".8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {po.supplier?.name || "—"}
                      </p>
                      <p style={{ fontSize: ".8125rem", color: "var(--text-muted)", marginTop: ".2rem" }}>
                        {formatDate(po.created_at)}
                      </p>
                    </div>
                  </div>
                  <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={`badge ${STATUS_BADGE[po.status] ?? "badge-gray"}`} style={{ textTransform: "capitalize" }}>
                      {po.status}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1.125rem" }}>
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
                    justifyContent: "flex-end",
                    gap: "0.5rem",
                    borderBottomLeftRadius: "var(--radius)",
                    borderBottomRightRadius: "var(--radius)",
                  }}
                >
                  <Link
                    to={`/purchase-orders/${po.id}`}
                    className="btn-icon"
                    title={t("purchaseOrders.detail")}
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {po.status === "draft" && hasPermission(PERMISSIONS.PURCHASE_ORDERS_EDIT) && (
                    <button
                      onClick={() => sendMutation.mutate(po.id)}
                      className="btn-icon edit"
                      title={t("purchaseOrders.send")}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  {(po.status === "sent" || po.status === "partial") && hasPermission(PERMISSIONS.PURCHASE_ORDERS_EDIT) && (
                    <button
                      onClick={() => {
                        if (confirm(t("purchaseOrders.receiveConfirm")))
                          receiveMutation.mutate(po.id);
                      }}
                      className="btn-icon"
                      title={t("purchaseOrders.receive")}
                      style={{ color: "var(--success)" }}
                    >
                      <CheckCircle className="w-4 h-4" />
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
            <select
              value={form.supplier_id}
              onChange={(e) =>
                setForm({ ...form, supplier_id: e.target.value })
              }
              className="form-select"
            >
              <option value="">
                {t("purchaseOrders.form.supplierPlaceholder")}
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
                  className="p-4 bg-card border border-[var(--border)] rounded-xl flex flex-col gap-3 relative"
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
                      <select
                        required
                        value={item.product_id}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i] = {
                            ...items[i],
                            product_id: e.target.value,
                          };
                          const p = products.find(
                            (p) => p.id === Number(e.target.value),
                          );
                          if (p) items[i].price = p.buy_price;
                          setForm({ ...form, items });
                        }}
                        className="form-select"
                      >
                        <option value="">
                          {t("purchaseOrders.form.productPlaceholder")}
                        </option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="text-xs text-secondary mb-1">Qty</label>
                      <input
                        type="number"
                        required
                        min={1}
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
              className="w-full p-3 border-2 border-dashed border-[var(--border)] rounded-xl text-sm font-medium text-secondary hover:text-primary hover:border-primary transition-all bg-transparent"
            >
              + {t("purchaseOrders.form.addItem")}
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">{t("purchaseOrders.form.notes")}</label>
            <textarea
              placeholder={t("purchaseOrders.form.notesPlaceholder")}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="form-input"
              rows={2}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
