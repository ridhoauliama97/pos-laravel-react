import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuthStore } from "../stores";
import { useT } from "../i18n";
import { useState, useEffect } from "react";
import { Loader2, Camera, AlertTriangle, Eye, EyeOff } from "../components/icons";
import toast from "react-hot-toast";
import CropModal from "../components/CropModal";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const t = useT();

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["settings-profile"],
    queryFn: () => api.get<any>("/settings/profile"),
  });

  const profile = profileData?.data;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const profileMutation = useMutation({
    mutationFn: (data: typeof form) => api.put<any>("/settings/profile", data),
    onSuccess: (res) => {
      updateUser({
        name: res.data.name,
        email: res.data.email,
        phone: res.data.phone,
        address: res.data.address,
      });
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      toast.success(t("settings.profileSuccess"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: typeof passwordForm) =>
      api.put<any>("/settings/password", data),
    onSuccess: () => {
      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      toast.success(t("profile.passwordSuccess"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropComplete = async (blob: Blob) => {
    setCropImage(null);
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", blob, "avatar.jpg");
      const res = await fetch("/api/settings/avatar", {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
          "X-Tenant-ID": "1",
          "X-Branch-ID": localStorage.getItem("selectedBranchId") || "1",
        },
        body: formData,
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Server returned an invalid response");
      }
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Upload avatar gagal");
      }
      updateUser({ avatar: json.data.avatar });
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      toast.success("Avatar uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAvatarUploading(false);
    }
  };

  useEffect(() => {
    if (profile)
      setForm({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
      });
  }, [profile]);

  const resetForm = () => {
    if (profile)
      setForm({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
      });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("profile.title")}</h1>
          <p className="page-subtitle">{t("profile.subtitle")}</p>
        </div>
      </div>

      <div className="card" style={{ padding: "1.75rem" }}>
        {profileLoading ? (
          <div
            className="skeleton"
            style={{ height: "16rem", borderRadius: "8px" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              maxWidth: "32rem",
            }}
          >
            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  style={{
                    width: "4rem",
                    height: "4rem",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid var(--border)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "4rem",
                    height: "4rem",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                  }}
                >
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
                {avatarUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {t("profile.uploadAvatar")}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {/* Profile Form */}
            <div className="form-group">
              <label className="form-label">{t("settings.profile.name")}</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {t("settings.profile.email")}
              </label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="form-input"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: ".75rem",
              }}
            >
              <div className="form-group">
                <label className="form-label">
                  {t("settings.profile.phone")}
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t("settings.profile.address")}
                </label>
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: ".5rem" }}>
              <button
                onClick={() => profileMutation.mutate(form)}
                disabled={profileMutation.isPending}
                className="btn btn-primary"
              >
                {profileMutation.isPending
                  ? t("common.saving")
                  : t("settings.profile.save")}
              </button>
              <button onClick={resetForm} className="btn btn-ghost">
                {t("common.reset")}
              </button>
            </div>

            {/* Password Change */}
            <div
              className="border-t pt-4 "
              style={{ borderColor: "var(--border)" }}
            >
              <h3
                style={{
                  fontSize: ".95rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                  color: "var(--text-primary)",
                }}
              >
                {t("profile.changePassword")}
              </h3>

              <div className="form-group" style={{ marginBottom: "0.25rem" }}>
                <label className="form-label">
                  {t("profile.currentPassword")}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword.current ? "text" : "password"}
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        current_password: e.target.value,
                      })
                    }
                    className="form-input"
                    style={{ paddingRight: "2.5rem" }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((p) => ({ ...p, current: !p.current }))
                    }
                    style={{
                      position: "absolute",
                      right: "0.5rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      padding: "0.25rem",
                    }}
                  >
                    {showPassword.current ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: ".75rem",
                  marginTop: "0.75rem",
                }}
              >
                <div className="form-group">
                  <label className="form-label">
                    {t("profile.newPassword")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword.new ? "text" : "password"}
                      value={passwordForm.new_password}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          new_password: e.target.value,
                        })
                      }
                      className="form-input"
                      style={{ paddingRight: "2.5rem" }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((p) => ({ ...p, new: !p.new }))
                      }
                      style={{
                        position: "absolute",
                        right: "0.5rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "0.25rem",
                      }}
                    >
                      {showPassword.new ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {t("profile.confirmPassword")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword.confirm ? "text" : "password"}
                      value={passwordForm.new_password_confirmation}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          new_password_confirmation: e.target.value,
                        })
                      }
                      className="form-input"
                      style={{ paddingRight: "2.5rem" }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((p) => ({ ...p, confirm: !p.confirm }))
                      }
                      style={{
                        position: "absolute",
                        right: "0.5rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "0.25rem",
                      }}
                    >
                      {showPassword.confirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => passwordMutation.mutate(passwordForm)}
                disabled={passwordMutation.isPending}
                className="btn btn-primary"
                style={{ marginTop: ".5rem" }}
              >
                {passwordMutation.isPending
                  ? t("common.saving")
                  : t("profile.changePassword")}
              </button>
            </div>

            {/* Danger Zone */}
            <div
              className="border-t pt-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                style={{
                  border: "1px solid #ef4444",
                  borderRadius: "10px",
                  padding: "1.25rem",
                }}
              >
                <h3
                  style={{
                    fontSize: ".95rem",
                    fontWeight: 600,
                    marginBottom: ".5rem",
                    color: "#ef4444",
                  }}
                >
                  {t("profile.dangerZone")}
                </h3>
                <p
                  style={{
                    fontSize: ".85rem",
                    color: "var(--text-muted)",
                    marginBottom: "1rem",
                    lineHeight: 1.5,
                  }}
                >
                  {t("profile.dangerDesc")}
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="btn"
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  {t("profile.deleteAccount")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: "center" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: "3.5rem",
                  height: "3.5rem",
                  borderRadius: "50%",
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle
                  className="w-7 h-7"
                  style={{ color: "#ef4444" }}
                />
              </div>
            </div>
            <h3 className="modal-title" style={{ marginBottom: ".5rem" }}>
              {t("profile.deleteConfirm")}
            </h3>
            <p
              style={{
                fontSize: ".875rem",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                marginBottom: "1.5rem",
              }}
            >
              {t("profile.deleteWarning")}
            </p>
            <div
              className="modal-footer"
              style={{
                justifyContent: "center",
                borderTop: "none",
                paddingTop: 0,
                marginTop: 0,
              }}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-ghost"
              >
                {t("profile.deleteCancel")}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  toast.error("Fitur belum tersedia");
                }}
                className="btn"
                style={{ background: "#ef4444", color: "#fff", border: "none" }}
              >
                {t("profile.deleteConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
      {cropImage && (
        <CropModal
          image={cropImage}
          aspect={1}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImage(null)}
        />
      )}
    </div>
  );
}
