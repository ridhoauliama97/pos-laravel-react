import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatCurrency, formatDate } from "../lib/utils";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Percent, Tag } from "lucide-react";
import { useState } from "react";
import type { Promotion, Category } from "../types";
import { useT } from "../i18n";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { Modal } from "../components/Modal";

export default function PromotionsPage() {
  const t = useT();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SETTINGS_PROMOTIONS);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    category_id: "",
    type: "percent",
    value: 0,
    min_purchase: 0,
    start_date: "",
    end_date: "",
    is_active: true,
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => api.get<Promotion[]>("/promotions"),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-promo"],
    queryFn: () => api.get<Category[]>("/categories?per_page=100"),
  });

  const categories = categoriesData?.data || [];

  const saveMutation = useMutation({
    mutationFn: (d: any) =>
      editingId
        ? api.put(`/promotions/${editingId}`, d)
        : api.post("/promotions", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      setShowModal(false);
      setEditingId(null);
      setForm({
        name: "",
        category_id: "",
        type: "percent",
        value: 0,
        min_purchase: 0,
        start_date: "",
        end_date: "",
        is_active: true,
      });
      toast.success(
        editingId ? t("promotions.updated") : t("promotions.created"),
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/promotions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast.success(t("promotions.deleted"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const promotions = data?.data || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("promotions.title")}</h1>
          <p className="page-subtitle">{t("promotions.subtitle")}</p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditingId(null);
              setForm({
                name: "",
                category_id: "",
                type: "percent",
                value: 0,
                min_purchase: 0,
                start_date: "",
                end_date: "",
                is_active: true,
              });
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> {t("promotions.add")}
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1rem",
        }}
      >
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: "8rem", borderRadius: "12px" }}
            />
          ))
        ) : promotions.length === 0 ? (
          <div style={{ gridColumn: "1/-1" }}>
            <div className="empty-state">
              <Percent style={{ width: "2.5rem", height: "2.5rem" }} />
              <p>{t("promotions.empty")}</p>
            </div>
          </div>
        ) : (
          promotions.map((p: any) => (
            <div
              key={p.id}
              className="card"
              style={{
                padding: "1.25rem",
                transition: "box-shadow .2s, transform .2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "var(--shadow-md)";
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "";
                (e.currentTarget as HTMLElement).style.transform = "";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".5rem",
                      marginBottom: ".5rem",
                    }}
                  >
                    <h3
                      style={{ fontWeight: 600, color: "var(--text-primary)" }}
                    >
                      {p.name}
                    </h3>
                    <span
                      className={`badge ${p.is_active ? "badge-success" : "badge-gray"}`}
                    >
                      {p.is_active ? t("common.active") : t("common.inactive")}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".5rem",
                      marginBottom: ".375rem",
                    }}
                  >
                    <span
                      className="badge badge-info"
                      style={{ textTransform: "capitalize" }}
                    >
                      {p.type}
                    </span>
                    <span
                      style={{
                        fontSize: ".875rem",
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      {p.type === "percent"
                        ? `${p.value}%`
                        : p.type === "fixed"
                          ? formatCurrency(p.value)
                          : "Bundle"}
                    </span>
                  </div>
                    {p.category && (
                      <p
                        style={{
                          fontSize: ".75rem",
                          color: "var(--accent)",
                          display: "flex",
                          alignItems: "center",
                          gap: ".25rem",
                        }}
                      >
                        <Tag className="w-3 h-3" />
                        {p.category.name}
                      </p>
                    )}
                    {p.min_purchase > 0 && (
                    <p
                      style={{ fontSize: ".75rem", color: "var(--text-muted)" }}
                    >
                      Min. {formatCurrency(p.min_purchase)}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: ".75rem",
                      color: "var(--text-muted)",
                      marginTop: ".375rem",
                    }}
                  >
                    {formatDate(p.start_date)} — {formatDate(p.end_date)}
                  </p>
                </div>
                {canManage && (
                  <div style={{ display: "flex", gap: ".25rem", flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setForm({
                          name: p.name,
                          category_id: String(p.category_id ?? ""),
                          type: p.type,
                          value: p.value,
                          min_purchase: p.min_purchase,
                          start_date: p.start_date?.split("T")[0],
                          end_date: p.end_date?.split("T")[0],
                          is_active: p.is_active,
                        });
                        setShowModal(true);
                      }}
                      className="btn-icon edit"
                      title={t("common.edit")}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t("promotions.deleteConfirm")))
                          deleteMutation.mutate(p.id);
                      }}
                      className="btn-icon danger"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? t("promotions.editTitle") : t("promotions.addTitle")}
        size="md"
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
              form="promotion-form"
              disabled={saveMutation.isPending}
              className="btn btn-primary"
            >
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
          </>
        }
      >
        <form
          id="promotion-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate({
              ...form,
              category_id: form.category_id || null,
            });
          }}
          className="flex flex-col gap-4"
        >
          <div className="form-group">
            <label className="form-label">{t("promotions.form.name")} *</label>
            <input
              required
              placeholder={t("promotions.form.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("promotions.form.category")}</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="form-select"
            >
              <option value="">{t("common.all")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p
              style={{
                fontSize: ".6875rem",
                color: "var(--text-muted)",
                marginTop: ".25rem",
              }}
            >
              {t("promotions.form.categoryHint")}
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">{t("promotions.form.type")} *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="form-select"
            >
              <option value="percent">{t("promotions.form.percentage")}</option>
              <option value="fixed">{t("promotions.form.nominal")}</option>
              <option value="bundle">{t("promotions.form.bundle")}</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t("promotions.form.value")} *</label>
            <input
              type="number"
              required
              value={form.value}
              onChange={(e) =>
                setForm({ ...form, value: Number(e.target.value) })
              }
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              {t("promotions.form.minPurchase")}
            </label>
            <input
              type="number"
              value={form.min_purchase}
              onChange={(e) =>
                setForm({ ...form, min_purchase: Number(e.target.value) })
              }
              className="form-input"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">
                {t("promotions.form.startDate")} *
              </label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {t("promotions.form.endDate")} *
              </label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
