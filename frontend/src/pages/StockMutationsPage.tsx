import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatDate } from "../lib/utils";
import toast from "react-hot-toast";
import { useState } from "react";
import { Plus, ArrowUpDown } from "lucide-react";
import type { Product } from "../types";
import { useT } from "../i18n";

interface StockMutation {
  id: number;
  product_id: number;
  product_variant_id?: number;
  product?: { id: number; name: string; sku?: string };
  variant?: { id: number; name: string };
  user?: { id: number; name: string };
  type: "in" | "out";
  reference_type: string;
  qty: number;
  stock_before: number;
  stock_after: number;
  note?: string;
  created_at: string;
}

export default function StockMutationsPage() {
  const t = useT();
  const [tab, setTab] = useState<"list" | "adjust">("list");
  const [typeFilter, setTypeFilter] = useState("");
  const queryClient = useQueryClient();

  const [adjustForm, setAdjustForm] = useState({
    product_id: "",
    note: "",
    type: "in",
    qty: 1,
  });

  const { data: mutationsData, isLoading } = useQuery({
    queryKey: ["stock-mutations", typeFilter],
    queryFn: () =>
      api.get<StockMutation[]>(`/stock/mutations?type=${typeFilter}`),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => api.get<Product[]>("/products?per_page=200"),
  });

  const adjustMutation = useMutation({
    mutationFn: () =>
      api.post("/stock/adjust", {
        product_id: Number(adjustForm.product_id),
        type: adjustForm.type,
        qty: adjustForm.qty,
        note: adjustForm.note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-mutations"] });
      setAdjustForm({ product_id: "", note: "", type: "in", qty: 1 });
      toast.success(t("stockMutations.successToast"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mutations = mutationsData?.data || [];
  const products = productsData?.data || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("stockMutations.title")}</h1>
          <p className="page-subtitle">{t("stockMutations.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button
            onClick={() => setTab("list")}
            className={tab === "list" ? "btn btn-primary" : "btn btn-ghost"}
          >
            {t("stockMutations.tabs.history")}
          </button>
          <button
            onClick={() => setTab("adjust")}
            className={tab === "adjust" ? "btn btn-primary" : "btn btn-ghost"}
          >
            <Plus className="w-4 h-4" /> {t("stockMutations.tabs.adjustment")}
          </button>
        </div>
      </div>

      {tab === "list" && (
        <>
          <div className="filter-pills">
            {[
              { val: "", label: t("common.all") },
              { val: "in", label: t("common.incoming") },
              { val: "out", label: t("common.outgoing") },
            ].map((f) => (
              <button
                key={f.val}
                onClick={() => setTypeFilter(f.val)}
                className={`pill ${typeFilter === f.val ? "active" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="table-card">
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>{t("stockMutations.table.product")}</th>
                    <th>{t("stockMutations.table.variant")}</th>
                    <th className="center">{t("stockMutations.table.type")}</th>
                    <th className="right">{t("stockMutations.table.qty")}</th>
                    <th className="right">
                      {t("stockMutations.table.stockBefore")}
                    </th>
                    <th className="right">
                      {t("stockMutations.table.stockAfter")}
                    </th>
                    <th>{t("stockMutations.table.reference")}</th>
                    <th>{t("stockMutations.table.user")}</th>
                    <th>{t("stockMutations.table.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="table-empty">
                        {t("stockMutations.loading")}
                      </td>
                    </tr>
                  ) : mutations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="table-empty">
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
                    mutations.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 500 }}>
                          {m.product?.name || "—"}
                        </td>
                        <td className="muted">{m.variant?.name || "—"}</td>
                        <td className="center">
                          <span
                            className={`badge ${m.type === "in" ? "badge-success" : "badge-danger"}`}
                          >
                            {m.type === "in"
                              ? t("common.incoming")
                              : t("common.outgoing")}
                          </span>
                        </td>
                        <td className="right" style={{ fontWeight: 600 }}>
                          {m.qty}
                        </td>
                        <td className="right muted">{m.stock_before}</td>
                        <td className="right muted">{m.stock_after}</td>
                        <td className="muted" style={{ fontSize: ".8rem" }}>
                          {m.reference_type}
                          {m.note ? ` (${m.note})` : ""}
                        </td>
                        <td className="muted">{m.user?.name || "—"}</td>
                        <td className="muted" style={{ fontSize: ".8rem" }}>
                          {formatDate(m.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "adjust" && (
        <div className="card" style={{ maxWidth: "30rem", padding: "1.5rem" }}>
          <h3
            style={{
              fontWeight: 600,
              marginBottom: "1rem",
              color: "var(--text-primary)",
            }}
          >
            {t("stockMutations.adjustmentTitle")}
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adjustMutation.mutate();
            }}
            style={{ display: "flex", flexDirection: "column", gap: ".875rem" }}
          >
            <div className="form-group">
              <label className="form-label">
                {t("stockMutations.form.product")} *
              </label>
              <select
                required
                value={adjustForm.product_id}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, product_id: e.target.value })
                }
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
              <label className="form-label">
                {t("stockMutations.form.type")} *
              </label>
              <select
                value={adjustForm.type}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, type: e.target.value })
                }
                className="form-select"
              >
                <option value="in">{t("stockMutations.form.stockIn")}</option>
                <option value="out">{t("stockMutations.form.stockOut")}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                {t("stockMutations.form.qty")} *
              </label>
              <input
                type="number"
                required
                min={1}
                value={adjustForm.qty}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, qty: Number(e.target.value) })
                }
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {t("stockMutations.form.notes")} *
              </label>
              <textarea
                required
                value={adjustForm.note}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, note: e.target.value })
                }
                className="form-textarea"
                rows={2}
                placeholder={t("stockMutations.form.notesPlaceholder")}
              />
            </div>
            <button
              type="submit"
              disabled={adjustMutation.isPending}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {adjustMutation.isPending
                ? t("common.processing")
                : t("common.save")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
