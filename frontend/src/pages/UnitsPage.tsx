import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Ruler, AlertTriangle } from "../components/icons";
import { useState } from "react";
import { useT } from "../i18n";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";
import { Modal } from "../components/Modal";
import { ConfirmDialog } from "../components/ConfirmDialog";

export default function UnitsPage() {
  const t = useT();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.UNITS_MANAGE) || hasPermission(PERMISSIONS.PRODUCTS_EDIT);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["units"],
    queryFn: () => api.get<any[]>("/units"),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, string> = { name };
      if (short) payload.short = short;
      return editingId
        ? api.put(`/units/${editingId}`, payload)
        : api.post("/units", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      setShowModal(false);
      setEditingId(null);
      setName("");
      setShort("");
      toast.success(
        editingId ? t("units.updated") : t("units.created"),
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast.success(t("units.deleted"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const units = data?.data || [];

  function openAdd() {
    setEditingId(null);
    setName("");
    setShort("");
    setShowModal(true);
  }

  function openEdit(unit: any) {
    setEditingId(unit.id);
    setName(unit.name);
    setShort(unit.short || "");
    setShowModal(true);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("units.title")}</h1>
          <p className="page-subtitle">{t("units.subtitle")}</p>
        </div>
        {canManage && (
          <button onClick={openAdd} className="btn btn-primary">
            <Plus className="w-4 h-4" /> {t("units.add")}
          </button>
        )}
      </div>

      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>{t("units.form.name")}</th>
                <th>{t("units.form.short")}</th>
                {canManage && <th className="right">{t("common.actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 3 : 2} className="table-empty">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={canManage ? 3 : 2} className="table-empty">
                    <AlertTriangle style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto .75rem", opacity: 0.3 }} />
                    <p>{error instanceof Error ? error.message : t("common.error")}</p>
                  </td>
                </tr>
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 3 : 2} className="table-empty">
                    <Ruler style={{ width: "2.5rem", height: "2.5rem", margin: "0 auto .75rem", opacity: 0.3 }} />
                    <p>{t("units.empty")}</p>
                  </td>
                </tr>
              ) : (
                units.map((unit: any) => (
                  <tr key={unit.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{unit.name}</div>
                    </td>
                    <td>
                      {unit.short && (
                        <span className="badge badge-info">{unit.short}</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="right">
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: ".25rem" }}>
                          <button
                            onClick={() => openEdit(unit)}
                            className="btn-icon edit"
                            title={t("common.edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(unit.id)}
                            className="btn-icon danger"
                            title={t("common.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? t("units.editTitle") : t("units.addTitle")}
        size="sm"
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
              form="unit-form"
              disabled={saveMutation.isPending}
              className="btn btn-primary"
            >
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
          </>
        }
      >
        <form
          id="unit-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <div className="form-group">
            <label className="form-label">{t("units.form.name")} *</label>
            <input
              required
              placeholder={t("units.form.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("units.form.short")}</label>
            <input
              placeholder={t("units.form.shortPlaceholder")}
              value={short}
              onChange={(e) => setShort(e.target.value)}
              className="form-input"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId !== null) deleteMutation.mutate(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
        title={t("common.delete")}
        message={`${t("units.deleteConfirm")} "${units.find((u: any) => u.id === deleteConfirmId)?.name}"?`}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
