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
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xl animate-fade-in">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
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

const getColorClasses = (color: string) => {
  switch (color) {
    case "indigo":
      return "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400";
    case "emerald":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
    case "amber":
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
    case "rose":
      return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400";
    default:
      return "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400";
  }
};

export default function DashboardPage() {
  const t = useT();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardSummary>("/dashboard/summary"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl animate-pulse"
              style={{ background: "var(--bg-card)" }}
            />
          ))}
        </div>
        <div
          className="h-88 rounded-2xl animate-pulse"
          style={{ background: "var(--bg-card)" }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-2xl animate-pulse"
              style={{ background: "var(--bg-card)" }}
            />
          ))}
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
      color: "indigo",
    },
    {
      label: t("common.transactions"),
      value: String(s?.today_transactions || 0),
      icon: ShoppingCart,
      sub: t("dashboard.today"),
      color: "emerald",
    },
    {
      label: t("dashboard.totalProducts"),
      value: String(s?.total_products || 0),
      icon: Package,
      sub: t("dashboard.allBranches"),
      color: "amber",
    },
    {
      label: t("dashboard.customers"),
      value: String(s?.total_customers || 0),
      icon: Users,
      sub: t("dashboard.registered"),
      color: "rose",
    },
  ];

  const chartData = Array.isArray(s?.sales_chart)
    ? s.sales_chart.map((d) => ({
        date: d.date?.slice(5),
        total: d.total,
      }))
    : [];

  const maxRevenue = s?.top_products?.length
    ? Math.max(...s.top_products.map((p) => p.total_revenue))
    : 1;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm backdrop-blur-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {t("dashboard.thisMonth")}
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {formatCurrency(s?.this_month_sales || 0)}
            </span>
          </div>
          {s && s.sales_growth_percent != null && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-sm transition-colors ${
                s.sales_growth_percent >= 0
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                  : "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
              }`}
            >
              {s.sales_growth_percent >= 0 ? (
                <TrendingUp className="w-4.5 h-4.5" />
              ) : (
                <TrendingDown className="w-4.5 h-4.5" />
              )}
              <span className="font-bold">
                {Math.abs(s.sales_growth_percent)}%
              </span>
              <span className="text-xs opacity-75 hidden sm:inline">
                {t("dashboard.vsLastMonth")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {card.label}
              </span>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${getColorClasses(card.color)}`}
              >
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              {card.value}
            </p>
            {"change" in card && card.change != null && (
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${card.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
              >
                <ArrowUpRight
                  className={`w-3.5 h-3.5 ${card.change < 0 ? "rotate-90" : ""}`}
                />
                <span>
                  {card.change >= 0 ? "+" : ""}
                  {card.change}% {t("dashboard.vsLastMonth")}
                </span>
              </div>
            )}
            {"sub" in card && card.sub && (
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {card.sub}
              </p>
            )}
            {/* Decorative background blur */}
            <div
              className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-40 ${getColorClasses(card.color).split(" ")[0]}`}
            />
          </div>
        ))}
      </div>

      {/* Chart + Stock Alert */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("dashboard.salesChart")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.last14Days")}
              </p>
            </div>
            {chartData.length > 0 && (
              <div className="text-right">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("dashboard.totalPeriod")}
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(chartData.reduce((a, d) => a + d.total, 0))}
                </p>
              </div>
            )}
          </div>
          {chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--accent)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--accent)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="var(--border)"
                    vertical={false}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                    tickFormatter={(v) => (v / 1000).toFixed(0) + "k"}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: "var(--border)",
                      strokeWidth: 2,
                      strokeDasharray: "4 4",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--accent)"
                    strokeWidth={3}
                    fill="url(#salesGrad)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-72 text-slate-400 dark:text-slate-500">
              <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">
                {t("dashboard.noSalesData")}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("dashboard.inventoryStatus")}
            </h2>
            <Link
              to="/products"
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            </Link>
          </div>

          <div className="space-y-4 flex-1">
            <Link to="/products?filter=low_stock" className="block group">
              <div className="relative overflow-hidden rounded-xl p-5 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/5 transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800">
                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-16 h-16 text-amber-500" />
                </div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </div>
                    <span className="font-semibold text-amber-900 dark:text-amber-400">
                      {t("dashboard.lowStock")}
                    </span>
                  </div>
                  <span className="text-3xl font-black text-amber-600 dark:text-amber-500">
                    {s?.low_stock_count || 0}
                  </span>
                </div>
                <p className="text-xs font-medium text-amber-700/70 dark:text-amber-500/70 mt-2 relative z-10">
                  {t("dashboard.lowStockDesc")}
                </p>
              </div>
            </Link>

            <Link to="/products?filter=out_of_stock" className="block group">
              <div className="relative overflow-hidden rounded-xl p-5 border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-500/5 transition-all hover:shadow-md hover:border-rose-300 dark:hover:border-rose-800">
                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-16 h-16 text-rose-500" />
                </div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                      {s?.out_of_stock_count && s.out_of_stock_count > 0 && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      )}
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </div>
                    <span className="font-semibold text-rose-900 dark:text-rose-400">
                      {t("dashboard.outOfStock")}
                    </span>
                  </div>
                  <span className="text-3xl font-black text-rose-600 dark:text-rose-500">
                    {s?.out_of_stock_count || 0}
                  </span>
                </div>
                <p className="text-xs font-medium text-rose-700/70 dark:text-rose-500/70 mt-2 relative z-10">
                  {t("dashboard.outOfStockDesc")}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom rows */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("dashboard.topProducts")}
            </h2>
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
              {t("dashboard.top5")}
            </span>
          </div>

          {s?.top_products && s.top_products.length > 0 ? (
            <div className="space-y-5">
              {s.top_products.map((p, i) => {
                const percentage = Math.max(
                  5,
                  (p.total_revenue / maxRevenue) * 100,
                );
                return (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-(--accent) group-hover:text-white transition-colors">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                          {p.product_name}
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-4">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(p.total_revenue)}
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {p.total_qty} {t("dashboard.sold")}
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${percentage}%`,
                          background: "var(--accent)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <Package className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">{t("dashboard.noSales")}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("dashboard.recentTransactions")}
            </h2>
            <Link
              to="/transactions"
              className="text-sm font-semibold text-(--accent) hover:opacity-80 transition-opacity"
            >
              {t("dashboard.viewAll")}
            </Link>
          </div>

          {s?.recent_transactions && s.recent_transactions.length > 0 ? (
            <div className="space-y-3">
              {s.recent_transactions.slice(0, 5).map((trx) => (
                <Link
                  to={`/transactions/${trx.id}`}
                  key={trx.id}
                  className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0 group-hover:scale-105 transition-transform">
                      {getInitials(trx.user?.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {trx.invoice_no}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {t("dashboard.cashierLabel")}{" "}
                        {trx.user?.name || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-4">
                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {formatCurrency(trx.grand_total)}
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        trx.status === "completed"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : trx.status === "void"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                      }`}
                    >
                      {trx.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <ShoppingCart className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">
                {t("dashboard.noTransactions")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
