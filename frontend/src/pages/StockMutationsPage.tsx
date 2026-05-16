import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatDate } from "../lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowUpDown } from "../components/icons";
import { useT } from "../i18n";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";

interface StockMutation {
  id: number;
  product_id: number;
  product_variant_id?: number;
  product?: { id: number; name: string; sku?: string };
  variant?: { id: number; name: string };
  user?: { id: number; name: string };
  type: "in" | "out";
  reference_type: string;
  qty: number;
  stock_before: number;
  stock_after: number;
  note?: string;
  created_at: string;
}

export default function StockMutationsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canAdjust = hasPermission(PERMISSIONS.STOCK_ADJUSTMENTS);
  const [typeFilter, setTypeFilter] = useState("");

  const { data: mutationsData, isLoading } = useQuery({
    queryKey: ["stock-mutations", typeFilter],
    queryFn: () =>
      api.get<StockMutation[]>(`/stock/mutations?type=${typeFilter}`),
  });

  const mutations = mutationsData?.data || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("stockMutations.title")}</h1>
          <p className="page-subtitle">{t("stockMutations.subtitle")}</p>
        </div>
        {canAdjust && (
          <button
            onClick={() => navigate("/stock/adjustments/new")}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> {t("stockMutations.tabs.adjustment")}
          </button>
        )}
      </div>

      <>
        <div className="filter-pills">
            {[
              { val: "", label: t("common.all") },
              { val: "in", label: t("common.incoming") },
              { val: "out", label: t("common.outgoing") },
            ].map((f) => (
              <button
                key={f.val}
                onClick={() => setTypeFilter(f.val)}
                className={`pill ${typeFilter === f.val ? "active" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="table-card">
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>{t("stockMutations.table.product")}</th>
                    <th>{t("stockMutations.table.variant")}</th>
                    <th className="center">{t("stockMutations.table.type")}</th>
                    <th className="right">{t("stockMutations.table.qty")}</th>
                    <th className="right">
                      {t("stockMutations.table.stockBefore")}
                    </th>
                    <th className="right">
                      {t("stockMutations.table.stockAfter")}
                    </th>
                    <th>{t("stockMutations.table.reference")}</th>
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
                  ) : mutations.length === 0 ? (
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
                    mutations.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 500 }}>
                          {m.product?.name || "—"}
                        </td>
                        <td className="muted">{m.variant?.name || "—"}</td>
                        <td className="center">
                          <span
                            className={`badge ${m.type === "in" ? "badge-success" : "badge-danger"}`}
                          >
                            {m.type === "in"
                              ? t("common.incoming")
                              : t("common.outgoing")}
                          </span>
                        </td>
                        <td className="right" style={{ fontWeight: 600 }}>
                          {m.qty}
                        </td>
                        <td className="right muted">{m.stock_before}</td>
                        <td className="right muted">{m.stock_after}</td>
                        <td className="muted" style={{ fontSize: ".8rem" }}>
                          {m.reference_type}
                          {m.note ? ` (${m.note})` : ""}
                        </td>
                        <td className="muted">{m.user?.name || "—"}</td>
                        <td className="muted" style={{ fontSize: ".8rem" }}>
                          {formatDate(m.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
    </div>
  );
}
