import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatCurrency, formatDate, exportXLSX } from "../lib/utils";
import { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileText,
  FileSpreadsheet,
  Calendar,
} from "lucide-react";
import type { Transaction } from "../types";
import { useT } from "../i18n";

export default function PosHistoryPage() {
  const t = useT();
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pos-history", dateFrom, dateTo, page],
    queryFn: () =>
      api.get<Transaction[]>(
        `/pos/history?date_from=${dateFrom}&date_to=${dateTo}&page=${page}&per_page=20`,
      ),
    placeholderData: (prev) => prev,
  });

  const transactions = data?.data || [];
  const meta = data?.meta;

  const handleDateFrom = useCallback((val: string) => {
    setDateFrom(val);
    setPage(1);
  }, []);

  const handleDateTo = useCallback((val: string) => {
    setDateTo(val);
    setPage(1);
  }, []);

  const allTransactionsQuery = useQuery({
    queryKey: ["pos-history-export", dateFrom, dateTo],
    queryFn: () =>
      api.get<Transaction[]>(
        `/pos/history/export?date_from=${dateFrom}&date_to=${dateTo}`,
      ),
    enabled: false,
  });

  const handleExportExcel = useCallback(async () => {
    const res = await allTransactionsQuery.refetch();
    const allData = res.data?.data || [];
    if (!allData.length) return;

    const rows = allData.map((tr) => ({
      [t("posHistory.table.invoice")]: tr.invoice_no,
      [t("posHistory.table.cashier")]: tr.user?.name ?? "",
      [t("posHistory.table.customer")]: tr.customer?.name ?? "",
      [t("posHistory.table.time")]: formatDate(tr.created_at),
      [t("posHistory.table.items")]: tr.items?.reduce((s, i) => s + i.qty, 0) ?? 0,
      [t("posHistory.table.method")]: tr.payment_method,
      [t("posHistory.table.subtotal")]: tr.subtotal,
      [t("posHistory.table.total")]: tr.grand_total,
      [t("posHistory.table.status")]: tr.status,
    }));

    exportXLSX(rows, `transactions_${dateFrom}_${dateTo}`);
  }, [allTransactionsQuery, dateFrom, dateTo, t]);

  const handleExportPdf = useCallback(async () => {
    const res = await allTransactionsQuery.refetch();
    const allData = res.data?.data || [];
    if (!allData.length) return;

    const rowsHtml = allData
      .map(
        (tr) =>
          `<tr>
            <td>${tr.invoice_no}</td>
            <td>${tr.user?.name ?? ""}</td>
            <td>${tr.customer?.name ?? ""}</td>
            <td>${formatDate(tr.created_at)}</td>
            <td style="text-align:right">${tr.items?.reduce((s, i) => s + i.qty, 0) ?? 0}</td>
            <td>${tr.payment_method}</td>
            <td style="text-align:right">${formatCurrency(tr.subtotal)}</td>
            <td style="text-align:right">${formatCurrency(tr.grand_total)}</td>
            <td>${tr.status}</td>
          </tr>`,
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head>
        <title>Laporan Transaksi ${dateFrom} - ${dateTo}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 1rem; }
          h2 { margin-bottom: .5rem; }
          p { color: #666; margin-bottom: 1rem; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <h2>Laporan Transaksi</h2>
        <p>${dateFrom} — ${dateTo} | ${allData.length} transaksi</p>
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Kasir</th>
              <th>Pelanggan</th>
              <th>Waktu</th>
              <th class="right">Item</th>
              <th>Metode</th>
              <th class="right">Subtotal</th>
              <th class="right">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, [allTransactionsQuery, dateFrom, dateTo]);

  if (isError)
    return (
      <div className="page-container">
        <div
          className="card card-body"
          style={{ textAlign: "center", color: "#dc2626", padding: "3rem" }}
        >
          {t("errors.loadFailed")} {(error as any)?.message}
        </div>
      </div>
    );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("posHistory.title")}</h1>
          <p className="page-subtitle">{t("posHistory.subtitle")}</p>
        </div>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: "1rem",
          marginBottom: "1rem",
          display: "flex",
          flexWrap: "wrap",
          gap: ".75rem",
          alignItems: "flex-end",
        }}
      >
        <div className="form-group" style={{ margin: 0, minWidth: "8rem" }}>
          <label className="form-label" style={{ fontSize: ".75rem" }}>
            {t("posHistory.dateFrom")}
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFrom(e.target.value)}
            className="form-input"
            style={{ width: "100%" }}
          />
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: "8rem" }}>
          <label className="form-label" style={{ fontSize: ".75rem" }}>
            {t("posHistory.dateTo")}
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateTo(e.target.value)}
            className="form-input"
            style={{ width: "100%" }}
          />
        </div>
        <Calendar
          style={{
            width: "1.25rem",
            height: "1.25rem",
            color: "var(--text-muted)",
            marginBottom: ".25rem",
          }}
        />
        <div style={{ flex: 1 }} />

        {transactions.length > 0 && (
          <>
            <button
              onClick={handleExportPdf}
              className="btn btn-ghost"
              style={{ fontSize: ".8125rem", gap: ".375rem" }}
            >
              <FileText className="w-4 h-4" />
              {t("posHistory.exportPdf")}
            </button>
            <button
              onClick={handleExportExcel}
              className="btn btn-ghost"
              style={{ fontSize: ".8125rem", gap: ".375rem" }}
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t("posHistory.exportExcel")}
            </button>
          </>
        )}
      </div>

      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>{t("posHistory.table.invoice")}</th>
                <th>{t("posHistory.table.cashier")}</th>
                <th>{t("posHistory.table.customer")}</th>
                <th>{t("posHistory.table.time")}</th>
                <th className="right">{t("posHistory.table.items")}</th>
                <th>{t("posHistory.table.method")}</th>
                <th className="right">{t("posHistory.table.subtotal")}</th>
                <th className="right">{t("posHistory.table.total")}</th>
                <th className="center">{t("posHistory.table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="table-empty">
                    {t("posHistory.loading")}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-empty">
                    <Receipt
                      style={{
                        width: "2.5rem",
                        height: "2.5rem",
                        margin: "0 auto .75rem",
                        opacity: 0.3,
                      }}
                    />
                    <p>{t("posHistory.empty")}</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr.id}>
                    <td>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: ".8rem",
                          fontWeight: 500,
                          color: "var(--accent)",
                        }}
                      >
                        {tr.invoice_no}
                      </span>
                    </td>
                    <td className="muted">{tr.user?.name}</td>
                    <td className="muted">{tr.customer?.name || "—"}</td>
                    <td className="muted" style={{ fontSize: ".8rem" }}>
                      {formatDate(tr.created_at)}
                    </td>
                    <td className="right">
                      {tr.items?.reduce((s, i) => s + i.qty, 0) ?? "—"}
                    </td>
                    <td>
                      <span
                        className="badge badge-gray"
                        style={{ textTransform: "capitalize" }}
                      >
                        {tr.payment_method}
                      </span>
                    </td>
                    <td className="right muted">
                      {formatCurrency(tr.subtotal)}
                    </td>
                    <td className="right" style={{ fontWeight: 600 }}>
                      {formatCurrency(tr.grand_total)}
                    </td>
                    <td className="center">
                      <span
                        className={`badge ${
                          tr.status === "completed"
                            ? "badge-success"
                            : tr.status === "void"
                              ? "badge-danger"
                              : "badge-gray"
                        }`}
                      >
                        {tr.status}
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
                className="page-nav"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 || p === meta.last_page || Math.abs(p - page) <= 2,
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
                className="page-nav"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
