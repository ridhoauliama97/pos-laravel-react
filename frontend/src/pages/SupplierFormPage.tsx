import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { ArrowLeft, Save } from "../components/icons";
import type { Supplier } from "../types";
import { useT } from "../i18n";

export default function SupplierFormPage() {
  const t = useT();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    opening_balance: 0,
    is_active: true,
  });

  const { data: supplierData, isLoading: isLoadingSupplier } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => api.get<Supplier>(`/suppliers/${id}`),
    enabled: isEdit,
  });

  const supplier = supplierData?.data;

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        opening_balance: supplier.opening_balance,
        is_active: supplier.is_active,
      });
    }
  }, [supplier]);

  const saveMutation = useMutation({
    mutationFn: (d: typeof form) =>
      isEdit
        ? api.put(`/suppliers/${id}`, d)
        : api.post("/suppliers", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier", id] });
      toast.success(isEdit ? t("suppliers.updated") : t("suppliers.created"));
      navigate("/suppliers");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFieldChange = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  if (isEdit && isLoadingSupplier) {
    return (
      <div className="page-container">
        <div className="card card-body" style={{ textAlign: "center", padding: "3rem" }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (isEdit && !supplier && !isLoadingSupplier) {
    return (
      <div className="page-container">
        <div
          className="card card-body"
          style={{ textAlign: "center", color: "#dc2626", padding: "3rem" }}
        >
          {t("errors.loadFailed")}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: "48rem" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <button
            onClick={() => navigate("/suppliers")}
            className="btn-icon"
            style={{ flexShrink: 0 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">
              {isEdit ? t("suppliers.editTitle") : t("suppliers.addTitle")}
            </h1>
            <p className="page-subtitle">{t("suppliers.subtitle")}</p>
          </div>
        </div>
      </div>

      <form id="supplier-form" onSubmit={handleSubmit}>
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Name */}
          <div className="form-group">
            <label className="form-label">{t("suppliers.form.name")} *</label>
            <input
              required
              value={form.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className="form-input"
              placeholder={t("suppliers.form.namePlaceholder")}
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">{t("suppliers.form.phone")}</label>
              <input
                value={form.phone}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                className="form-input"
                placeholder={t("suppliers.form.phonePlaceholder")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("suppliers.form.email")}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                className="form-input"
                placeholder={t("suppliers.form.emailPlaceholder")}
              />
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">{t("suppliers.form.address")}</label>
            <textarea
              value={form.address}
              onChange={(e) => handleFieldChange("address", e.target.value)}
              className="form-textarea"
              rows={2}
              placeholder={t("suppliers.form.addressPlaceholder")}
            />
          </div>

          {/* Opening Balance */}
          <div className="form-group">
            <label className="form-label">{t("suppliers.form.openingBalance")}</label>
            <input
              type="number"
              value={form.opening_balance}
              onChange={(e) => handleFieldChange("opening_balance", Number(e.target.value))}
              className="form-input"
            />
          </div>

          {/* Active Status */}
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <input
              type="checkbox"
              id="is_active_supplier"
              checked={form.is_active}
              onChange={(e) => handleFieldChange("is_active", e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
            />
            <label htmlFor="is_active_supplier" style={{ fontSize: ".875rem", color: "var(--text-secondary)" }}>
              {t("common.active")}
            </label>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: ".5rem", minWidth: "8rem", justifyContent: "center" }}
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
