import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores";
import { useT } from "../i18n";
import toast from "react-hot-toast";

export default function LoginPage() {
  const t = useT();
  const [email, setEmail] = useState("admin@pos.test");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const validate = (): boolean => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errs.email = t("login.emailRequired") || "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = t("login.emailInvalid") || "Format email tidak valid";
    }
    if (!password) {
      errs.password = t("login.passwordRequired") || "Password wajib diisi";
    } else if (password.length < 6) {
      errs.password =
        t("login.passwordMinLength") || "Password minimal 6 karakter";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await login(email, password);
      toast.success(t("login.success"));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || t("login.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, var(--bg-secondary), var(--bg-primary))",
        padding: "1rem",
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "24rem",
          background: "var(--bg-card)",
          borderRadius: "1rem",
          boxShadow: "var(--shadow-lg)",
          padding: "2.5rem",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--accent)",
            }}
          >
            {t("login.title")}
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              marginTop: ".375rem",
              fontSize: ".875rem",
            }}
          >
            {t("login.subtitle")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          noValidate
        >
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              {t("login.email")}
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              className={`form-input${errors.email ? " form-input--error" : ""}`}
              placeholder={t("login.emailPlaceholder")}
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "login-email-error" : undefined}
            />
            {errors.email && (
              <p className="form-error" id="login-email-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              {t("login.password")}
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }));
              }}
              className={`form-input${errors.password ? " form-input--error" : ""}`}
              placeholder={t("login.passwordPlaceholder")}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
            />
            {errors.password && (
              <p className="form-error" id="login-password-error" role="alert">
                {errors.password}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: ".75rem",
              gap: ".5rem",
            }}
          >
            {loading && <span className="spinner spinner-sm" aria-hidden />}
            {loading ? t("login.loggingIn") : t("login.loginButton")}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: ".75rem",
            color: "var(--text-muted)",
            marginTop: "1.5rem",
          }}
        >
          {t("login.demoHint")}
        </p>
      </div>
    </div>
  );
}
