import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { ArrowLeft, Save } from "../components/icons";
import type { Product } from "../types";
import { useT } from "../i18n";
import { useAuthStore } from "../stores";
import { SearchSelect } from "../components/SearchSelect";

export default function StockAdjustmentFormPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedBranchId = useAuthStore((s) => s.selectedBranchId);

  const [form, setForm] = useState({
    product_id: "",
    note: "",
    type: "in" as "in" | "out",
    qty: 1,
    to_branch_id: "",
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-all-adj-form"],
    queryFn: () => api.get<Product[]>("/products?per_page=200"),
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches-adj-form"],
    queryFn: () => api.get<any[]>("/branches"),
  });

  const products = (productsData?.data || []).filter((p: any) => {
    const variantStock =
      p.variants?.reduce((s: number, v: any) => s + v.stock, 0) ?? 0;
    return (p.stock ?? 0) + variantStock > 0;
  });

  const branches = branchesData?.data || [];
  const otherBranches = branches.filter((b: any) => b.id !== selectedBranchId);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        product_id: Number(form.product_id),
        type: form.type,
        qty: form.qty,
        note: form.note,
      };
      if (form.type === "out" && form.to_branch_id) {
        payload.to_branch_id = Number(form.to_branch_id);
      }
      return api.post("/stock/adjust", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["products-all-adj"] });
      queryClient.invalidateQueries({ queryKey: ["products-all-adj-form"] });
      toast.success(t("stockMutations.successToast"));
      navigate("/stock/adjustments");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFieldChange = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="page-container" style={{ maxWidth: "48rem" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <button
            onClick={() => navigate("/stock/adjustments")}
            className="btn-icon"
            style={{ flexShrink: 0 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">
              {t("stockMutations.adjustmentTitle")}
            </h1>
            <p className="page-subtitle">{t("stockMutations.subtitle")}</p>
          </div>
        </div>
      </div>

      <form id="adjustment-form" onSubmit={handleSubmit}>
        <div
          className="card"
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <SearchSelect
            label={`${t("stockMutations.form.product")} *`}
            options={products}
            value={form.product_id}
            onChange={(v) => handleFieldChange("product_id", v)}
            placeholder={t("stockMutations.form.productPlaceholder")}
            required
          />

          <div className="form-group">
            <label className="form-label">
              {t("stockMutations.form.type")} *
            </label>
            <select
              name="type"
              autoComplete="off"
              value={form.type}
              onChange={(e) =>
                handleFieldChange("type", e.target.value as "in" | "out")
              }
              className="form-select"
            >
              <option value="in">{t("stockMutations.form.stockIn")}</option>
              <option value="out">{t("stockMutations.form.stockOut")}</option>
            </select>
          </div>

          {form.type === "out" && (
            <SearchSelect
              label={t("stockMutations.form.destinationBranch")}
              options={otherBranches}
              value={form.to_branch_id}
              onChange={(v) => handleFieldChange("to_branch_id", v)}
              placeholder={t(
                "stockMutations.form.destinationBranchPlaceholder",
              )}
              required
            />
          )}

          <div className="form-group">
            <label className="form-label">
              {t("stockMutations.form.qty")} *
            </label>
            <input
              type="number"
              required
              min={1}
              name="qty"
              autoComplete="off"
              value={form.qty}
              onChange={(e) => handleFieldChange("qty", Number(e.target.value))}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {t("stockMutations.form.notes")} *
            </label>
            <textarea
              required
              name="note"
              autoComplete="off"
              value={form.note}
              onChange={(e) => handleFieldChange("note", e.target.value)}
              className="form-textarea"
              rows={2}
              placeholder={t("stockMutations.form.notesPlaceholder")}
            />
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "1.25rem",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".5rem",
                minWidth: "8rem",
                justifyContent: "center",
              }}
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
