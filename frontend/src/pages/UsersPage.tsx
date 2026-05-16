import { useT } from "../i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  LayoutGrid,
  List,
  AlertTriangle,
  Eye,
} from "../components/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User, Role, UserActivityLog } from "../types";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { Modal } from "../components/Modal";

const ROLE_BADGE: Record<string, string> = {
  super_admin: "badge-danger",
  admin_cabang: "badge-info",
  kasir: "badge-success",
  gudang: "badge-warning",
};

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  checkout: "Checkout",
  void: "Void Transaksi",
  create_user: "Buat User",
  update_user: "Update User",
  delete_user: "Hapus User",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityUserId, setActivityUserId] = useState<number | null>(null);
  const [activityPage, setActivityPage] = useState(1);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const t = useT();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SETTINGS_USERS);

  const { data, isLoading } = useQuery({
    queryKey: ["users", search, roleFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ search });
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("is_active", statusFilter);
      return api.get<User[]>(`/users?${params}`);
    },
  });

  const { data: activityData } = useQuery({
    queryKey: ["user-activities", activityUserId, activityPage],
    queryFn: () =>
      api.get<UserActivityLog[]>(
        `/users/${activityUserId}/activities?page=${activityPage}`,
      ),
    enabled: !!activityUserId,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<Role[]>("/roles"),
  });

  const users = data?.data || [];
  const roles = rolesData?.data || [];

  const activeLog = activityUserId
    ? users.find((u) => u.id === activityUserId)
    : null;
  const activityLogs = activityData?.data || [];
  const activityMeta = activityData?.meta;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.deleted"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.delete(`/users/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      toast.success(t("users.deleted"));
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || err.message),
  });

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(users.map((u: User) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const openActivity = (userId: number) => {
    setActivityUserId(userId);
    setActivityPage(1);
    setShowActivityModal(true);
  };

  const AvatarImg = ({
    user,
    size = 32,
  }: {
    user: User;
    size?: number;
  }) =>
    user.avatar ? (
      <img
        src={user.avatar}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    ) : (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--accent-light)",
          color: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.375,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {user.name.charAt(0).toUpperCase()}
      </div>
    );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("users.title")}</h1>
          <p className="page-subtitle">{t("users.subtitle")}</p>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                background: "var(--bg-hover)",
                padding: "0.25rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                className={`btn-icon ${viewMode === "list" ? "active" : ""}`}
                style={
                  viewMode === "list"
                    ? { background: "var(--bg-card)", boxShadow: "var(--shadow-sm)" }
                    : {}
                }
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                className={`btn-icon ${viewMode === "grid" ? "active" : ""}`}
                style={
                  viewMode === "grid"
                    ? { background: "var(--bg-card)", boxShadow: "var(--shadow-sm)" }
                    : {}
                }
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="btn btn-danger"
              >
                <Trash2 className="w-4 h-4" /> {t("common.delete")} ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => navigate("/settings/users/new")}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> {t("users.add")}
            </button>
          </div>
        )}
      </div>

      <div
        className="actions-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div className="search-wrap" style={{ maxWidth: "18rem", flexGrow: 1 }}>
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder={t("users.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="form-select"
            style={{ width: "auto", fontSize: ".8125rem", padding: ".35rem 2rem .35rem .75rem" }}
          >
            <option value="">{t("users.filters.allRoles")}</option>
            {roles.map((r: Role) => (
              <option key={r.name} value={r.name}>{r.display_name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: "auto", fontSize: ".8125rem", padding: ".35rem 2rem .35rem .75rem" }}
          >
            <option value="">{t("users.filters.allStatus")}</option>
            <option value="1">{t("common.active")}</option>
            <option value="0">{t("common.inactive")}</option>
          </select>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="table-card">
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "3rem", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedIds.length === users.length}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate =
                            selectedIds.length > 0 &&
                            selectedIds.length < users.length;
                        }
                      }}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                  </th>
                  <th>{t("users.table.user")}</th>
                  <th>{t("users.table.email")}</th>
                  <th>{t("users.table.phone")}</th>
                  <th className="center">{t("users.table.role")}</th>
                  <th>{t("users.table.branch")}</th>
                  <th className="center">{t("users.table.status")}</th>
                  <th className="right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      {t("users.loading")}
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      <Users
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          margin: "0 auto .75rem",
                          opacity: 0.3,
                        }}
                      />
                      <p>{t("users.empty")}</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      style={
                        selectedIds.includes(u.id)
                          ? { background: "var(--accent-light)" }
                          : {}
                      }
                    >
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: ".625rem",
                          }}
                        >
                          <AvatarImg user={u} size={32} />
                          <span style={{ fontWeight: 500 }}>{u.name}</span>
                        </div>
                      </td>
                      <td className="muted">{u.email}</td>
                      <td className="muted">{u.phone || "—"}</td>
                      <td className="center">
                        <span
                          className={`badge ${ROLE_BADGE[u.role] ?? "badge-gray"}`}
                          style={{ textTransform: "capitalize" }}
                        >
                          {roles.find((r) => r.name === u.role)?.display_name ||
                            u.role?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="muted">{u.branch?.name || "—"}</td>
                      <td className="center">
                        <span
                          className={`badge ${u.is_active ? "badge-success" : "badge-gray"}`}
                        >
                          {u.is_active
                            ? t("common.active")
                            : t("common.inactive")}
                        </span>
                      </td>
                      <td className="right">
                        {canManage && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: ".25rem",
                            }}
                          >
                            <button
                              onClick={() => openActivity(u.id)}
                              className="btn-icon"
                              title={t("users.activityLog")}
                              style={{ color: "var(--text-muted)" }}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/settings/users/${u.id}/edit`)}
                              className="btn-icon edit"
                              title={t("common.edit")}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(t("users.deleteConfirm")))
                                  deleteMutation.mutate(u.id);
                              }}
                              className="btn-icon danger"
                              title={t("common.delete")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))",
            gap: "1rem",
          }}
        >
          {isLoading ? (
            <div
              className="table-empty"
              style={{
                gridColumn: "1 / -1",
                background: "var(--bg-card)",
                borderRadius: "var(--radius)",
              }}
            >
              {t("users.loading")}
            </div>
          ) : users.length === 0 ? (
            <div
              className="table-empty"
              style={{
                gridColumn: "1 / -1",
                background: "var(--bg-card)",
                borderRadius: "var(--radius)",
              }}
            >
              <Users
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  margin: "0 auto .75rem",
                  opacity: 0.3,
                }}
              />
              <p>{t("users.empty")}</p>
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "all 0.2s",
                  border: selectedIds.includes(u.id)
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
                  boxShadow: selectedIds.includes(u.id)
                    ? "0 0 0 1px var(--accent)"
                    : "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    zIndex: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => toggleSelect(u.id)}
                    style={{
                      accentColor: "var(--accent)",
                      width: "1.25rem",
                      height: "1.25rem",
                      cursor: "pointer",
                    }}
                  />
                </div>
                <div
                  className="card-body"
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "1rem",
                      paddingRight: "2rem",
                    }}
                  >
                    <AvatarImg user={u} size={48} />
                    <div>
                      <h3
                        style={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginBottom: "0.125rem",
                        }}
                      >
                        {u.name}
                      </h3>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {u.email}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                      flex: 1,
                    }}
                  >
                    <div style={{ marginBottom: "0.25rem" }}>
                      <strong>{t("users.table.phone")}:</strong> {u.phone || "—"}
                    </div>
                    <div style={{ marginBottom: "0.25rem" }}>
                      <strong>{t("users.table.branch")}:</strong>{" "}
                      {u.branch?.name || "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      marginTop: "auto",
                    }}
                  >
                    <span
                      className={`badge ${ROLE_BADGE[u.role] ?? "badge-gray"}`}
                      style={{ textTransform: "capitalize" }}
                    >
                      {roles.find((r) => r.name === u.role)?.display_name ||
                        u.role?.replace("_", " ")}
                    </span>
                    <span
                      className={`badge ${u.is_active ? "badge-success" : "badge-gray"}`}
                    >
                      {u.is_active
                        ? t("common.active")
                        : t("common.inactive")}
                    </span>
                  </div>
                </div>

                {canManage && (
                  <div
                    style={{
                      padding: "0.75rem 1.25rem",
                      borderTop: "1px solid var(--border)",
                      background: "var(--bg-hover)",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "0.5rem",
                      borderBottomLeftRadius: "var(--radius)",
                      borderBottomRightRadius: "var(--radius)",
                    }}
                  >
                    <button
                      onClick={() => openActivity(u.id)}
                      className="btn-icon"
                      title={t("users.activityLog")}
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/settings/users/${u.id}/edit`)}
                      className="btn-icon edit"
                      title={t("common.edit")}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t("users.deleteConfirm")))
                          deleteMutation.mutate(u.id);
                      }}
                      className="btn-icon danger"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Bulk Delete Modal ── */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title={t("users.bulkDeleteConfirm").replace(
          "{count}",
          String(selectedIds.length),
        )}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(false)}
              className="btn btn-ghost"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              disabled={bulkDeleteMutation.isPending}
              className="btn btn-danger"
            >
              {bulkDeleteMutation.isPending
                ? t("common.loading")
                : t("common.delete")}
            </button>
          </>
        }
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "1rem 0",
          }}
        >
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "50%",
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <AlertTriangle className="w-8 h-8" />
          </div>
          <p
            style={{
              fontWeight: 600,
              fontSize: "1.0625rem",
              color: "var(--text-primary)",
              marginBottom: "0.5rem",
            }}
          >
            {t("users.bulkDeleteConfirm").replace(
              "{count}",
              String(selectedIds.length),
            )}
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            {t("users.bulkDeleteDesc")}
          </p>
        </div>
      </Modal>

      {/* ── Activity Log Modal ── */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => {
          setShowActivityModal(false);
          setActivityUserId(null);
          setActivityPage(1);
        }}
        title={
          activeLog
            ? t("users.activityTitle").replace("{name}", activeLog.name)
            : t("users.activityLog")
        }
        size="lg"
        footer={null}
      >
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {activityLogs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "var(--text-muted)",
              }}
            >
              <Eye
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  margin: "0 auto 0.75rem",
                  opacity: 0.3,
                }}
              />
              <p>{t("users.activityEmpty")}</p>
            </div>
          ) : (
            <>
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    padding: "0.75rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      background: "var(--accent-light)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {log.user?.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <span
                          className="badge"
                          style={{
                            background: "var(--bg-hover)",
                            color: "var(--text-color)",
                            fontSize: "0.75rem",
                          }}
                        >
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                        {log.description && (
                          <p
                            style={{
                              margin: "0.25rem 0 0",
                              fontSize: "0.8125rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {log.description}
                          </p>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString("id-ID", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                    {log.ip_address && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        IP: {log.ip_address}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {activityMeta && activityMeta.last_page > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "1rem 0",
                  }}
                >
                  <button
                    disabled={activityPage <= 1}
                    onClick={() => setActivityPage((p) => p - 1)}
                    className="btn btn-ghost"
                    style={{ fontSize: "0.8125rem" }}
                  >
                    Previous
                  </button>
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {activityPage} / {activityMeta.last_page}
                  </span>
                  <button
                    disabled={activityPage >= activityMeta.last_page}
                    onClick={() => setActivityPage((p) => p + 1)}
                    className="btn btn-ghost"
                    style={{ fontSize: "0.8125rem" }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
