import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { ArrowLeft, Save } from "../components/icons";
import type { User, Role } from "../types";
import { useT } from "../i18n";
import { SearchSelect } from "../components/SearchSelect";

export default function UserFormPage() {
  const t = useT();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "kasir",
    branch_id: "",
    is_active: true,
  });

  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user", id],
    queryFn: () => api.get<User>(`/users/${id}`),
    enabled: isEdit,
  });

  const user = userData?.data;

  const { data: rolesData } = useQuery({
    queryKey: ["roles-form"],
    queryFn: () => api.get<Role[]>("/roles"),
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches-form"],
    queryFn: () => api.get<any[]>("/branches"),
  });

  const roles = rolesData?.data || [];
  const branches = branchesData?.data || [];

  if (isEdit && user && !form.name) {
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      branch_id: String(user.branch_id || ""),
      is_active: user.is_active,
    });
  }

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit ? api.put(`/users/${id}`, data) : api.post("/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(isEdit ? t("users.updated") : t("users.created"));
      navigate("/settings/users");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { ...form };
    if (isEdit && !form.password) {
      delete payload.password;
    }
    saveMutation.mutate(payload);
  };

  if (isEdit && isLoadingUser) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
            <button
              onClick={() => navigate("/settings/users")}
              className="btn-icon"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="page-title">{t("common.loading")}</h1>
              <p className="page-subtitle">{t("users.subtitle")}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: "48rem" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <button
            onClick={() => navigate("/settings/users")}
            className="btn-icon"
            style={{ flexShrink: 0 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">
              {isEdit ? t("users.editTitle") : t("users.addTitle")}
            </h1>
            <p className="page-subtitle">{t("users.subtitle")}</p>
          </div>
        </div>
      </div>

      <form id="user-form" onSubmit={handleSubmit}>
        <div
          className="card"
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <div className="form-group">
            <label className="form-label">{t("users.form.name")}</label>
            <input
              required
              name="name"
              autoComplete="name"
              placeholder={t("users.form.namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t("users.form.email")}</label>
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              placeholder={t("users.form.email")}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {t("users.form.password")}
              {isEdit ? ` (${t("users.form.passwordHint")})` : ""}
            </label>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              spellCheck={false}
              placeholder={t("users.form.passwordPlaceholder")}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="form-input"
              required={!isEdit}
            />
          </div>

          <SearchSelect
            label={t("users.form.role")}
            options={roles}
            value={form.role}
            onChange={(v) => setForm({ ...form, role: v })}
            valueKey="name"
            labelKey="display_name"
            required
          />

          <SearchSelect
            label={t("users.form.branch")}
            options={branches}
            value={form.branch_id}
            onChange={(v) => setForm({ ...form, branch_id: v })}
            placeholder={t("users.form.branchPlaceholder")}
          />

          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <input
              type="checkbox"
              id="is_active_user"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
              style={{ accentColor: "var(--accent)" }}
            />
            <label
              htmlFor="is_active_user"
              style={{ fontSize: ".875rem", color: "var(--text-secondary)" }}
            >
              {t("common.active")}
            </label>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "1.25rem",
              display: "flex",
              justifyContent: "flex-end",
              gap: ".75rem",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/settings/users")}
              className="btn btn-ghost"
            >
              {t("common.cancel")}
            </button>
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
