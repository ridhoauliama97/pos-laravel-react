import { useQuery } from "@tanstack/react-query";
import { useT } from "../i18n";
import { api } from "../services/api";
import { formatCurrency } from "../lib/utils";
import type { DashboardSummary } from "../types";
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  PackageCheck,
  ArrowDown,
} from "../components/icons";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Link } from "react-router-dom";

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        <div className="chart-tooltip-value">
          <span className="chart-tooltip-dot" />
          {formatCurrency(payload[0].value)}
        </div>
        {payload[0]?.payload?.count && (
          <p className="chart-tooltip-count">
            {payload[0].payload.count} transaksi
          </p>
        )}
      </div>
    );
  }
  return null;
};

const getInitials = (name?: string) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export default function DashboardPage() {
  const t = useT();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardSummary>("/dashboard/summary"),
  });

  if (error) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4"
            style={{ color: "var(--danger)" }}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2
            className="text-lg font-semibold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Gagal memuat dashboard
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            {error instanceof Error ? error.message : "Terjadi kesalahan"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="skeleton h-33 rounded-xl"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
        <div className="skeleton h-95 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="skeleton h-95 rounded-xl" />
          <div className="skeleton h-95 rounded-xl" />
        </div>
      </div>
    );
  }

  const s = data?.data;

  const cards = [
    {
      label: t("dashboard.todaySales"),
      value: formatCurrency(s?.today_sales || 0),
      icon: DollarSign,
      change: s?.sales_growth_percent,
    },
    {
      label: t("common.transactions"),
      value: String(s?.today_transactions || 0),
      icon: ShoppingCart,
      sub: t("dashboard.today"),
    },
    {
      label: t("dashboard.totalProducts"),
      value: String(s?.total_products || 0),
      icon: Package,
      sub: t("dashboard.allBranches"),
    },
    {
      label: t("dashboard.customers"),
      value: String(s?.total_customers || 0),
      icon: Users,
      sub: t("dashboard.registered"),
    },
  ];

  const chartData = Array.isArray(s?.sales_chart)
    ? s.sales_chart.map((d) => ({
        date: d.date?.slice(5),
        total: d.total,
        count: d.count,
      }))
    : [];

  const totalChartRevenue = chartData.reduce((a, d) => a + d.total, 0);

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("dashboard.title")}</h1>
          <p className="page-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="month-badge">
            <span className="month-badge-label">
              {t("dashboard.thisMonth")}
            </span>
            <span className="month-badge-value">
              {formatCurrency(s?.this_month_sales || 0)}
            </span>
          </div>
          {s && s.sales_growth_percent != null && (
            <div
              className={`growth-badge ${s.sales_growth_percent >= 0 ? "growth-badge--up" : "growth-badge--down"}`}
            >
              {s.sales_growth_percent >= 0 ? (
                <TrendingUp className="w-4.5 h-4.5" />
              ) : (
                <TrendingDown className="w-4.5 h-4.5" />
              )}
              <span className="growth-badge-value">
                {s.sales_growth_percent >= 0 ? "+" : ""}
                {Math.abs(s.sales_growth_percent)}%
              </span>
              <span className="growth-badge-label">
                {t("dashboard.vsLastMonth")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-grid">
        {cards.map((card, i) => {
          const isUp =
            "change" in card && card.change != null && card.change >= 0;
          const isDown =
            "change" in card && card.change != null && card.change < 0;
          return (
            <div
              key={card.label}
              className="stat-card"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="stat-card-header">
                <span className="stat-card-label">{card.label}</span>
                <div className="stat-card-icon">
                  <card.icon />
                </div>
              </div>
              <p className="stat-card-value">{card.value}</p>
              <div className="stat-card-footer">
                {"change" in card && card.change != null && (
                  <span
                    className={`stat-card-change ${isUp ? "stat-card-change--up" : "stat-card-change--down"}`}
                  >
                    {isUp && <TrendingUp className="w-4.5 h-3.5" />}
                    {isDown && <TrendingDown className="w-4.5 h-3.5" />}
                    {card.change >= 0 ? "+" : ""}
                    {card.change}%
                  </span>
                )}
                {"sub" in card && card.sub && (
                  <span className="stat-card-sub">{card.sub}</span>
                )}
              </div>
              <div className="stat-card-bar" />
            </div>
          );
        })}
      </div>

      {/* ── Chart + Stock Alerts ── */}
      <div className="chart-alert-grid">
        <div className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{t("dashboard.salesChart")}</h2>
              <p className="panel-desc">{t("dashboard.last14Days")}</p>
            </div>
            {chartData.length > 0 && (
              <div className="panel-total">
                <span className="panel-total-label">
                  {t("dashboard.totalPeriod")}
                </span>
                <span className="panel-total-value">
                  {formatCurrency(totalChartRevenue)}
                </span>
              </div>
            )}
          </div>
          {chartData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--accent)"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--accent)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-muted)",
                      fontFamily: "Geist Mono, monospace",
                    }}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-muted)",
                      fontFamily: "Geist Mono, monospace",
                    }}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}jt`
                        : v >= 1000
                          ? `${(v / 1000).toFixed(0)}rb`
                          : String(v)
                    }
                    tickLine={false}
                    axisLine={false}
                    dx={-8}
                    width={60}
                  />
                  <Tooltip
                    content={<CustomChartTooltip />}
                    cursor={{
                      stroke: "var(--border)",
                      strokeWidth: 1.5,
                      strokeDasharray: "4 4",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    fill="url(#salesGrad)"
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="panel-empty">
              <TrendingUp className="w-10 h-10" />
              <p>{t("dashboard.noSalesData")}</p>
            </div>
          )}
        </div>

        <div className="panel alert-panel">
          <div className="panel-header">
            <h2 className="panel-title">{t("dashboard.inventoryStatus")}</h2>
          </div>
          <div className="alert-list">
            <Link
              to="/products?filter=low_stock"
              className="alert-card alert-card--warning"
            >
              <div className="alert-card-dot-wrap">
                <span className="alert-dot alert-dot--amber" />
              </div>
              <div className="alert-card-body">
                <div className="alert-card-top">
                  <span className="alert-card-title">
                    {t("dashboard.lowStock")}
                  </span>
                  <span className="alert-card-count">
                    {s?.low_stock_count || 0}
                  </span>
                </div>
                <p className="alert-card-desc">{t("dashboard.lowStockDesc")}</p>
              </div>
              <ArrowRight className="alert-card-arrow" />
            </Link>

            <Link
              to="/products?filter=out_of_stock"
              className="alert-card alert-card--danger"
            >
              <div className="alert-card-dot-wrap">
                <span className="alert-dot alert-dot--red" />
              </div>
              <div className="alert-card-body">
                <div className="alert-card-top">
                  <span className="alert-card-title">
                    {t("dashboard.outOfStock")}
                  </span>
                  <span className="alert-card-count">
                    {s?.out_of_stock_count || 0}
                  </span>
                </div>
                <p className="alert-card-desc">
                  {t("dashboard.outOfStockDesc")}
                </p>
              </div>
              <ArrowRight className="alert-card-arrow" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="bottom-grid">
        {/* Top Products */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">{t("dashboard.topProducts")}</h2>
            <span className="panel-badge">{t("dashboard.top5")}</span>
          </div>
          {s?.top_products && s.top_products.length > 0 ? (
            <div className="top-products-list">
              {s.top_products.map((p, i) => {
                const maxRevenue = s.top_products.reduce(
                  (max, prod) => Math.max(max, prod.total_revenue),
                  1,
                );
                const pct = Math.max(4, (p.total_revenue / maxRevenue) * 100);
                const colors = [
                  "var(--accent)",
                  "#f59e0b",
                  "#10b981",
                  "#8b5cf6",
                  "#ec4899",
                ];
                return (
                  <div
                    key={i}
                    className="top-product-item"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div
                      className="top-product-rank"
                      style={
                        { "--rank-color": colors[i] } as React.CSSProperties
                      }
                    >
                      {i + 1}
                    </div>
                    <div className="top-product-info">
                      <div className="top-product-row">
                        <span className="top-product-name">
                          {p.product_name}
                        </span>
                        <span className="top-product-revenue">
                          {formatCurrency(p.total_revenue)}
                        </span>
                      </div>
                      <div className="top-product-bar-track">
                        <div
                          className="top-product-bar-fill"
                          style={{ width: `${pct}%`, background: colors[i] }}
                        />
                      </div>
                      <span className="top-product-qty">
                        {p.total_qty} {t("dashboard.sold")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel-empty">
              <Package className="w-10 h-10" />
              <p>{t("dashboard.noSales")}</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">{t("dashboard.recentTransactions")}</h2>
            <Link to="/pos/history" className="panel-link">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          {s?.recent_transactions && s.recent_transactions.length > 0 ? (
            <div className="tx-list">
              {s.recent_transactions.slice(0, 5).map((trx) => (
                <Link
                  to={`/pos/history?id=${trx.id}`}
                  key={trx.id}
                  className="tx-item"
                >
                  <div className="tx-avatar">{getInitials(trx.user?.name)}</div>
                  <div className="tx-info">
                    <span className="tx-invoice">{trx.invoice_no}</span>
                    <span className="tx-cashier">
                      {trx.user?.name || "Unknown"}
                    </span>
                  </div>
                  <div className="tx-right">
                    <span className="tx-amount">
                      {formatCurrency(trx.grand_total)}
                    </span>
                    <span className={`tx-status tx-status--${trx.status}`}>
                      {trx.status === "completed" && (
                        <PackageCheck className="w-3 h-3" />
                      )}
                      {trx.status === "void" && (
                        <ArrowDown className="w-3 h-3" />
                      )}
                      {trx.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="panel-empty">
              <ShoppingCart className="w-10 h-10" />
              <p>{t("dashboard.noTransactions")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
