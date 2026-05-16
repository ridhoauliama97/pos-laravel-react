import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { ArrowLeft, Save } from "../components/icons";
import type { Customer } from "../types";
import { useT } from "../i18n";

export default function CustomerFormPage() {
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
    is_active: true,
    is_member: false,
  });

  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
    enabled: isEdit,
  });

  const customer = customerData?.data;

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        is_active: customer.is_active,
        is_member: customer.is_member,
      });
    }
  }, [customer]);

  const saveMutation = useMutation({
    mutationFn: (d: typeof form) =>
      isEdit
        ? api.put(`/customers/${id}`, d)
        : api.post("/customers", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers-stats"] });
      toast.success(isEdit ? t("customers.updated") : t("customers.created"));
      navigate("/customers");
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

  if (isEdit && isLoadingCustomer) {
    return (
      <div className="page-container">
        <div className="card card-body" style={{ textAlign: "center", padding: "3rem" }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (isEdit && !customer && !isLoadingCustomer) {
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
            onClick={() => navigate("/customers")}
            className="btn-icon"
            style={{ flexShrink: 0 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">
              {isEdit ? t("customers.editTitle") : t("customers.addTitle")}
            </h1>
            <p className="page-subtitle">{t("customers.subtitle")}</p>
          </div>
        </div>
      </div>

      <form id="customer-form" onSubmit={handleSubmit}>
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Checkboxes */}
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", fontSize: ".875rem", color: "var(--text-primary)" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => handleFieldChange("is_active", e.target.checked)}
                className="form-checkbox"
                style={{ width: "1.125rem", height: "1.125rem" }}
              />
              {t("customers.form.isActive")}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", fontSize: ".875rem", color: "var(--text-primary)" }}>
              <input
                type="checkbox"
                checked={form.is_member}
                onChange={(e) => handleFieldChange("is_member", e.target.checked)}
                className="form-checkbox"
                style={{ width: "1.125rem", height: "1.125rem" }}
              />
              {t("customers.form.isMember")}
            </label>
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="form-label">{t("customers.form.name")}</label>
            <input
              required
              value={form.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className="form-input"
              placeholder={t("customers.form.namePlaceholder")}
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">{t("customers.form.phone")}</label>
              <input
                value={form.phone}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                className="form-input"
                placeholder={t("customers.form.phonePlaceholder")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("customers.form.email")}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                className="form-input"
                placeholder={t("customers.form.emailPlaceholder")}
              />
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">{t("customers.form.address")}</label>
            <textarea
              value={form.address}
              onChange={(e) => handleFieldChange("address", e.target.value)}
              className="form-textarea"
              rows={2}
              placeholder={t("customers.form.addressPlaceholder")}
            />
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
