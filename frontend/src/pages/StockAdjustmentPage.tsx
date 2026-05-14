import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatDate } from "../lib/utils";
import toast from "react-hot-toast";
import { useState } from "react";
import { Plus, ArrowUpDown } from "lucide-react";
import type { Product } from "../types";
import { useT } from "../i18n";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";

import { Modal } from "../components/Modal";

interface Adjustment {
  id: number;
  product?: { id: number; name: string; sku?: string };
  user?: { id: number; name: string };
  type: "in" | "out";
  qty: number;
  stock_before: number;
  stock_after: number;
  note?: string;
  created_at: string;
}

export default function StockAdjustmentPage() {
  const t = useT();
  const { hasPermission } = usePermissions();
  const canAdjust = hasPermission(PERMISSIONS.STOCK_ADJUSTMENTS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    note: "",
    type: "in" as "in" | "out",
    qty: 1,
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["adjustments"],
    queryFn: () =>
      api.get<Adjustment[]>("/stock/mutations?reference_type=adjustment"),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-all-adj"],
    queryFn: () => api.get<Product[]>("/products?per_page=200"),
  });

  const adjustMutation = useMutation({
    mutationFn: () =>
      api.post("/stock/adjust", {
        product_id: Number(form.product_id),
        type: form.type,
        qty: form.qty,
        note: form.note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["products-all-adj"] });
      setForm({ product_id: "", note: "", type: "in", qty: 1 });
      setShowForm(false);
      toast.success(t("stockMutations.successToast"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const adjustments = data?.data || [];
  const products = productsData?.data || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("stockMutations.adjustmentTitle")}</h1>
          <p className="page-subtitle">{t("stockMutations.subtitle")}</p>
        </div>
        {canAdjust && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> {t("stockMutations.adjustmentNew")}
          </button>
        )}
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>{t("stockMutations.table.product")}</th>
              <th className="center">{t("stockMutations.table.type")}</th>
              <th className="right">{t("stockMutations.table.qty")}</th>
              <th className="right">{t("stockMutations.table.stockBefore")}</th>
              <th className="right">{t("stockMutations.table.stockAfter")}</th>
              <th>{t("stockMutations.table.notes")}</th>
              <th>{t("stockMutations.table.user")}</th>
              <th>{t("stockMutations.table.date")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  {t("stockMutations.loading")}
                </td>
              </tr>
            ) : adjustments.length === 0 ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  <ArrowUpDown
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      margin: "0 auto .75rem",
                      opacity: 0.3,
                    }}
                  />
                  <p>{t("stockMutations.empty")}</p>
                </td>
              </tr>
            ) : (
              adjustments.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.product?.name || "—"}</td>
                  <td className="center">
                    <span
                      className={`badge ${a.type === "in" ? "badge-success" : "badge-danger"}`}
                    >
                      {a.type === "in"
                        ? t("common.incoming")
                        : t("common.outgoing")}
                    </span>
                  </td>
                  <td className="right" style={{ fontWeight: 600 }}>
                    {a.qty}
                  </td>
                  <td className="right muted">{a.stock_before}</td>
                  <td className="right muted">{a.stock_after}</td>
                  <td
                    className="muted"
                    style={{
                      maxWidth: "200px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.note || "—"}
                  </td>
                  <td className="muted">{a.user?.name || "—"}</td>
                  <td className="muted" style={{ fontSize: ".8rem" }}>
                    {formatDate(a.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={t("stockMutations.adjustmentTitle")}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn btn-ghost"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              form="adjustment-form"
              disabled={adjustMutation.isPending}
              className="btn btn-primary"
            >
              {adjustMutation.isPending
                ? t("common.processing")
                : t("common.save")}
            </button>
          </>
        }
      >
        <form
          id="adjustment-form"
          onSubmit={(e) => {
            e.preventDefault();
            adjustMutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <div className="form-group">
            <label className="form-label">
              {t("stockMutations.form.product")} *
            </label>
            <select
              required
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="form-select"
            >
              <option value="">
                {t("stockMutations.form.productPlaceholder")}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku || "-"})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t("stockMutations.form.type")} *</label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as "in" | "out" })
              }
              className="form-select"
            >
              <option value="in">{t("stockMutations.form.stockIn")}</option>
              <option value="out">{t("stockMutations.form.stockOut")}</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t("stockMutations.form.qty")} *</label>
            <input
              type="number"
              required
              min={1}
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              {t("stockMutations.form.notes")} *
            </label>
            <textarea
              required
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="form-textarea"
              rows={2}
              placeholder={t("stockMutations.form.notesPlaceholder")}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
