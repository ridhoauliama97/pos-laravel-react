import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatDate } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowUpDown } from "../components/icons";
import { useT } from "../i18n";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";

interface Adjustment {
  id: number;
  product?: { id: number; name: string; sku?: string };
  user?: { id: number; name: string };
  type: "in" | "out";
  qty: number;
  stock_before: number;
  stock_after: number;
  note?: string;
  to_branch?: { id: number; name: string };
  created_at: string;
}

export default function StockAdjustmentPage() {
  const t = useT();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canAdjust = hasPermission(PERMISSIONS.STOCK_ADJUSTMENTS);

  const { data, isLoading } = useQuery({
    queryKey: ["adjustments"],
    queryFn: () =>
      api.get<Adjustment[]>("/stock/mutations?reference_type=adjustment"),
  });

  const adjustments = data?.data || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("stockMutations.adjustmentTitle")}</h1>
          <p className="page-subtitle">{t("stockMutations.subtitle")}</p>
        </div>
        {canAdjust && (
          <button
            onClick={() => navigate("/stock/adjustments/new")}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> {t("stockMutations.adjustmentNew")}
          </button>
        )}
      </div>

      <div className="table-card">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>{t("stockMutations.table.product")}</th>
                <th className="center">{t("stockMutations.table.type")}</th>
                <th className="right">{t("stockMutations.table.qty")}</th>
                <th className="right">{t("stockMutations.table.stockBefore")}</th>
                <th className="right">{t("stockMutations.table.stockAfter")}</th>
                <th>{t("stockMutations.table.notes")}</th>
                <th className="center">{t("stockMutations.table.toBranch")}</th>
                <th>{t("stockMutations.table.user")}</th>
                <th>{t("stockMutations.table.date")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="table-empty">
                    {t("stockMutations.loading")}
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-empty">
                    <ArrowUpDown
                      style={{
                        width: "2.5rem",
                        height: "2.5rem",
                        margin: "0 auto .75rem",
                        opacity: 0.3,
                      }}
                    />
                    <p>{t("stockMutations.empty")}</p>
                  </td>
                </tr>
              ) : (
                adjustments.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.product?.name || "—"}</td>
                    <td className="center">
                      <span
                        className={`badge ${a.type === "in" ? "badge-success" : "badge-danger"}`}
                      >
                        {a.type === "in"
                          ? t("common.incoming")
                          : t("common.outgoing")}
                      </span>
                    </td>
                    <td className="right" style={{ fontWeight: 600 }}>
                      {a.qty}
                    </td>
                    <td className="right muted">{a.stock_before}</td>
                    <td className="right muted">{a.stock_after}</td>
                    <td
                      className="muted"
                      style={{
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.note || "—"}
                    </td>
                    <td className="center">
                      {a.to_branch ? (
                        <span className="badge badge-info">
                          {a.to_branch.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="muted">{a.user?.name || "—"}</td>
                    <td className="muted" style={{ fontSize: ".8rem" }}>
                      {formatDate(a.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
