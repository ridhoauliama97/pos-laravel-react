import { useT } from "../i18n";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  formatCurrency,
  formatDate,
  exportCSV,
  exportXLSX,
} from "../lib/utils";
import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "../components/icons";
import type { Transaction } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ReportsPage() {
  const [tab, setTab] = useState<"sales" | "profit" | "transactions">("sales");
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [page, setPage] = useState(1);
  const t = useT();

  const switchTab = (t: typeof tab) => {
    setTab(t);
    setPage(1);
  };

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-report", dateFrom, dateTo],
    queryFn: () =>
      api.get<any>(`/reports/sales?start_date=${dateFrom}&end_date=${dateTo}`),
    enabled: tab === "sales",
  });

  const { data: profitData, isLoading: profitLoading } = useQuery({
    queryKey: ["profit-report", dateFrom, dateTo],
    queryFn: () =>
      api.get<any>(
        `/reports/profit-loss?start_date=${dateFrom}&end_date=${dateTo}`,
      ),
    enabled: tab === "profit",
  });

  const { data: transactionsData } = useQuery({
    queryKey: ["transactions-report", dateFrom, dateTo, page],
    queryFn: () =>
      api.get<Transaction[]>(
        `/reports/transactions?start_date=${dateFrom}&end_date=${dateTo}&page=${page}&per_page=20`,
      ),
    enabled: tab === "transactions",
  });

  const sales = salesData?.data;
  const profit = profitData?.data;
  const transactions = transactionsData?.data || [];
  const meta = transactionsData?.meta;

  const chartData =
    sales?.daily_sales?.map((d: any) => ({
      date: d.date?.slice(5),
      total: d.total,
      count: d.count,
    })) || [];

  const exportData = () => {
    if (tab === "transactions")
      return transactions.map((trx) => ({
        [t("reports.exportColumns.invoice")]: trx.invoice_no,
        [t("reports.exportColumns.cashier")]: trx.user?.name || "-",
        [t("reports.exportColumns.customer")]: trx.customer?.name || "-",
        [t("reports.exportColumns.date")]: trx.created_at,
        [t("reports.exportColumns.method")]: trx.payment_method,
        [t("reports.exportColumns.subtotal")]: trx.subtotal,
        [t("reports.exportColumns.total")]: trx.grand_total,
        [t("reports.exportColumns.status")]: trx.status,
      }));
    if (tab === "sales" && sales?.daily_sales)
      return sales.daily_sales.map((d: any) => ({
        [t("reports.exportColumns.date")]: d.date,
        [t("reports.exportColumns.sales")]: d.total,
        [t("reports.exportColumns.transactions")]: d.count,
      }));
    if (tab === "profit" && profit)
      return [
        {
          [t("reports.exportColumns.metric")]: t("reports.totalSales"),
          [t("reports.exportColumns.value")]: profit.total_sales,
        },
        {
          [t("reports.exportColumns.metric")]: t("reports.cogs"),
          [t("reports.exportColumns.value")]: profit.total_cogs,
        },
        {
          [t("reports.exportColumns.metric")]: t("reports.grossProfit"),
          [t("reports.exportColumns.value")]: profit.gross_profit,
        },
        {
          [t("reports.exportColumns.metric")]: t("reports.margin"),
          [t("reports.exportColumns.value")]: profit.margin_percent + "%",
        },
        {
          [t("reports.exportColumns.metric")]: t(
            "reports.exportColumns.transactionCount",
          ),
          [t("reports.exportColumns.value")]: profit.transaction_count,
        },
      ];
    return [];
  };

  const handleExportCSV = () => {
    const d = exportData();
    if (d.length > 0) exportCSV(d, `${tab}_${dateFrom}_${dateTo}`);
  };
  const handleExportXLSX = () => {
    const d = exportData();
    if (d.length > 0) exportXLSX(d, `${tab}_${dateFrom}_${dateTo}`);
  };

  // Accent color for chart (CSS variable fallback)
  const accentColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#6366f1";

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("reports.title")}</h1>
          <p className="page-subtitle">{t("reports.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button onClick={handleExportCSV} className="btn btn-ghost" aria-label="Export CSV">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={handleExportXLSX} className="btn btn-ghost" aria-label="Export XLSX">
            <FileSpreadsheet className="w-4 h-4" /> XLSX
          </button>
        </div>
      </div>

      {/* Tab & Date filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".5rem",
          flexWrap: "wrap",
        }}
      >
        <div className="filter-pills">
          {(
            [
              ["sales", t("reports.tabs.sales")],
              ["profit", t("reports.tabs.profitLoss")],
              ["transactions", t("reports.tabs.transactions")],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => switchTab(val as any)}
              className={`pill ${tab === val ? "active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: ".375rem",
          }}
        >
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="form-input"
            style={{ width: "auto", fontSize: ".8125rem" }} aria-label={t("reports.dateFrom")}
          />
          <span style={{ color: "var(--text-muted)" }}>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="form-input"
            style={{ width: "auto", fontSize: ".8125rem" }} aria-label={t("reports.dateTo")}
          />
        </div>
      </div>

      {/* Sales Tab */}
      {tab === "sales" && (
        <>
          {salesLoading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: ".75rem",
              }}
            >
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: "5.5rem", borderRadius: "12px" }}
                />
              ))}
            </div>
          ) : sales ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: ".75rem",
              }}
            >
              {[
                {
                  label: t("reports.totalSales"),
                  val: formatCurrency(sales.total_sales),
                },
                {
                  label: t("reports.totalTransactions"),
                  val: sales.total_transactions,
                },
                { label: t("reports.itemsSold"), val: sales.total_items_sold },
                {
                  label: t("reports.average"),
                  val: formatCurrency(Math.round(sales.average_transaction)),
                },
              ].map((s, i) => (
                <div key={i} className="card" style={{ padding: "1.25rem" }}>
                  <p
                    style={{
                      fontSize: ".8125rem",
                      color: "var(--text-muted)",
                      marginBottom: ".25rem",
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    style={{
                      fontSize: "1.375rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.val}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {chartData.length > 0 && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3
                style={{
                  fontWeight: 600,
                  marginBottom: "1rem",
                  color: "var(--text-primary)",
                }}
              >
                {t("reports.dailySalesChart")}
              </h3>
              <div style={{ height: "18rem", minWidth: 0, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                      tickFormatter={(v) => (v / 1000).toFixed(0) + "k"}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value) || 0),
                        t("reports.salesLabel"),
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        fontSize: "13px",
                        background: "var(--bg-card)",
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill={accentColor}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* Profit Tab */}
      {tab === "profit" &&
        (profitLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: ".75rem",
            }}
          >
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: "5.5rem", borderRadius: "12px" }}
              />
            ))}
          </div>
        ) : profit ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: ".75rem",
            }}
          >
            {[
              {
                label: t("reports.totalSales"),
                val: formatCurrency(profit.total_sales),
                color: "var(--success)",
              },
              {
                label: t("reports.cogs"),
                val: formatCurrency(profit.total_cogs),
                color: "var(--warning)",
              },
              {
                label: t("reports.grossProfit"),
                val: formatCurrency(profit.gross_profit),
                color: "var(--accent)",
              },
              {
                label: t("reports.margin"),
                val: profit.margin_percent + "%",
                color: "var(--text-primary)",
              },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: "1.25rem" }}>
                <p
                  style={{
                    fontSize: ".8125rem",
                    color: "var(--text-muted)",
                    marginBottom: ".25rem",
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    fontSize: "1.375rem",
                    fontWeight: 700,
                    color: s.color,
                  }}
                >
                  {s.val}
                </p>
              </div>
            ))}
          </div>
        ) : null)}

      {/* Transactions Tab */}
      {tab === "transactions" && (
        <div className="table-card">
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>{t("reports.table.invoice")}</th>
                  <th>{t("reports.table.cashier")}</th>
                  <th>{t("reports.table.customer")}</th>
                  <th>{t("reports.table.date")}</th>
                  <th>{t("reports.table.method")}</th>
                  <th className="right">{t("reports.table.total")}</th>
                  <th className="center">{t("reports.table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      <BarChart3
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          margin: "0 auto .75rem",
                          opacity: 0.3,
                        }}
                      />
                      <p>{t("reports.noTransactions")}</p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((trx) => (
                    <tr key={trx.id}>
                      <td>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: ".8rem",
                            fontWeight: 500,
                            color: "var(--accent)",
                          }}
                        >
                          {trx.invoice_no}
                        </span>
                      </td>
                      <td className="muted">{trx.user?.name}</td>
                      <td className="muted">{trx.customer?.name || "—"}</td>
                      <td className="muted" style={{ fontSize: ".8rem" }}>
                        {formatDate(trx.created_at)}
                      </td>
                      <td>
                        <span
                          className="badge badge-gray"
                          style={{ textTransform: "capitalize" }}
                        >
                          {trx.payment_method}
                        </span>
                      </td>
                      <td className="right" style={{ fontWeight: 600 }}>
                        {formatCurrency(trx.grand_total)}
                      </td>
                      <td className="center">
                        <span
                          className={`badge ${trx.status === "completed" ? "badge-success" : "badge-danger"}`}
                        >
                          {trx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="table-pagination">
              <span className="page-text">
                {(meta.current_page - 1) * meta.per_page + 1}–
                {Math.min(meta.current_page * meta.per_page, meta.total)} dari{" "}
                {meta.total}
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: ".25rem" }}
              >
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="page-nav" aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === meta.last_page ||
                      Math.abs(p - page) <= 2,
                  )
                  .map((p, i, arr) => (
                    <span
                      key={p}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: ".25rem",
                      }}
                    >
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span style={{ color: "var(--text-muted)" }}>…</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={p === page ? "page-current" : "page-default"}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="page-nav" aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
