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
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
        >
          <div className="form-group">
            <label className="form-label">{t("login.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder={t("login.emailPlaceholder")}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("login.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder={t("login.passwordPlaceholder")}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: ".75rem",
            }}
          >
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
