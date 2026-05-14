import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { formatCurrency, formatDate } from "../lib/utils";
import toast from "react-hot-toast";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  FileText,
  User,
  Building2,
  Clock,
  Package,
} from "lucide-react";
import { useT } from "../i18n";
import { usePermissions } from "../hooks/usePermissions";
import { PERMISSIONS } from "../constants/permissions";

interface POItem {
  id: number;
  product_id: number;
  product?: { id: number; name: string; sku?: string };
  qty: number;
  price: number;
  received_qty: number;
}
interface POReceiving {
  id: number;
  user?: { id: number; name: string };
  notes?: string;
  created_at: string;
}
interface PurchaseOrder {
  id: number;
  po_number: string;
  status: string;
  total: number;
  notes?: string;
  supplier?: { id: number; name: string; phone?: string };
  user?: { id: number; name: string };
  branch?: { id: number; name: string };
  items?: POItem[];
  receivings?: POReceiving[];
  created_at: string;
  updated_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "badge-gray",
  sent: "badge-info",
  partial: "badge-warning",
  completed: "badge-success",
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PERMISSIONS.PURCHASE_ORDERS_EDIT);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => api.get<PurchaseOrder>(`/purchase-orders/${id}`),
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success(t("purchaseOrders.sent"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const receiveMutation = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success(t("purchaseOrders.received"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const po = data?.data;

  if (isLoading)
    return (
      <div
        className="page-container"
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div
          className="skeleton"
          style={{ height: "2rem", width: "12rem", borderRadius: "8px" }}
        />
        <div
          className="skeleton"
          style={{ height: "10rem", borderRadius: "12px" }}
        />
        <div
          className="skeleton"
          style={{ height: "16rem", borderRadius: "12px" }}
        />
      </div>
    );

  if (!po)
    return (
      <div className="page-container">
        <div className="empty-state">
          <Package style={{ width: "3rem", height: "3rem" }} />
          <p>{t("purchaseOrderDetail.notFound")}</p>
          <button
            onClick={() => navigate("/purchase-orders")}
            className="btn btn-primary"
            style={{ marginTop: ".75rem" }}
          >
            {t("purchaseOrderDetail.backToList")}
          </button>
        </div>
      </div>
    );

  const items = po.items || [];
  const receivings = po.receivings || [];
  const allReceived = items.every((i) => i.received_qty >= i.qty);

  return (
    <div className="page-container">
      <button
        onClick={() => navigate("/purchase-orders")}
        className="btn btn-ghost"
        style={{
          marginBottom: ".5rem",
          padding: ".25rem .5rem",
          fontSize: ".8125rem",
        }}
      >
        <ArrowLeft className="w-4 h-4" /> {t("purchaseOrderDetail.back")}
      </button>

      {/* Header Card */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".75rem",
                marginBottom: ".375rem",
              }}
            >
              <h1
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: "var(--text-primary)",
                }}
              >
                {po.po_number}
              </h1>
              <span
                className={`badge ${STATUS_BADGE[po.status] ?? "badge-gray"}`}
                style={{ textTransform: "capitalize" }}
              >
                {po.status}
              </span>
            </div>
            {po.notes && (
              <p style={{ fontSize: ".875rem", color: "var(--text-muted)" }}>
                {po.notes}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: ".5rem" }}>
            {po.status === "draft" && canEdit && (
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="btn btn-primary"
              >
                <Send className="w-4 h-4" />{" "}
                {sendMutation.isPending
                  ? "Mengirim..."
                  : t("purchaseOrders.sendButton")}
              </button>
            )}
            {(po.status === "sent" || po.status === "partial") && canEdit && (
              <button
                onClick={() => {
                  if (confirm(t("purchaseOrders.receiveAllConfirm")))
                    receiveMutation.mutate();
                }}
                disabled={receiveMutation.isPending}
                className="btn"
                style={{ background: "var(--success)", color: "#fff" }}
              >
                <CheckCircle className="w-4 h-4" />{" "}
                {receiveMutation.isPending
                  ? t("common.processing")
                  : t("purchaseOrders.receiveButton")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: ".75rem",
        }}
      >
        {[
          {
            icon: Building2,
            label: t("purchaseOrderDetail.supplier"),
            val: po.supplier?.name || "—",
            sub: po.supplier?.phone,
          },
          {
            icon: User,
            label: t("purchaseOrderDetail.createdBy"),
            val: po.user?.name || "—",
            sub: po.branch?.name,
          },
          {
            icon: Clock,
            label: t("purchaseOrderDetail.date"),
            val: formatDate(po.created_at),
          },
        ].map((c, i) => (
          <div key={i} className="card" style={{ padding: "1.125rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".375rem",
                color: "var(--text-muted)",
                marginBottom: ".375rem",
              }}
            >
              <c.icon style={{ width: "1rem", height: "1rem" }} />
              <span
                style={{
                  fontSize: ".6875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                {c.label}
              </span>
            </div>
            <p style={{ fontWeight: 500, color: "var(--text-primary)" }}>
              {c.val}
            </p>
            {c.sub && (
              <p style={{ fontSize: ".8125rem", color: "var(--text-muted)" }}>
                {c.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Items Table */}
      <div className="table-card">
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3
            style={{
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
              color: "var(--text-primary)",
            }}
          >
            <FileText style={{ width: "1rem", height: "1rem" }} />{" "}
            {t("purchaseOrderDetail.itemsTitle")}
          </h3>
          <span style={{ fontSize: ".8125rem", color: "var(--text-muted)" }}>
            {items.length} item
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>{t("purchaseOrderDetail.table.product")}</th>
                <th className="center">{t("purchaseOrderDetail.table.qty")}</th>
                <th className="right">
                  {t("purchaseOrderDetail.table.price")}
                </th>
                <th className="right">
                  {t("purchaseOrderDetail.table.subtotal")}
                </th>
                <th className="center">
                  {t("purchaseOrderDetail.table.received")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    {t("purchaseOrderDetail.empty")}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>
                      {item.product?.name || `Produk#${item.product_id}`}
                    </td>
                    <td className="center">{item.qty}</td>
                    <td className="right muted">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="right" style={{ fontWeight: 500 }}>
                      {formatCurrency(item.qty * item.price)}
                    </td>
                    <td className="center">
                      <span
                        className={`badge ${item.received_qty >= item.qty ? "badge-success" : item.received_qty > 0 ? "badge-warning" : "badge-gray"}`}
                      >
                        {item.received_qty}/{item.qty}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="right" style={{ fontWeight: 500 }}>
                  {t("purchaseOrderDetail.total")}
                </td>
                <td
                  className="right"
                  style={{ fontWeight: 700, color: "var(--text-primary)" }}
                >
                  {formatCurrency(po.total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Receivings */}
      {receivings.length > 0 && (
        <div className="card" style={{ padding: "1.25rem" }}>
          <h3
            style={{
              fontWeight: 600,
              marginBottom: ".875rem",
              color: "var(--text-primary)",
            }}
          >
            {t("purchaseOrderDetail.receivingHistory")}
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}
          >
            {receivings.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: ".75rem",
                  background:
                    "color-mix(in srgb, var(--success) 8%, transparent)",
                  borderRadius: ".5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".5rem",
                  }}
                >
                  <CheckCircle
                    style={{
                      width: "1rem",
                      height: "1rem",
                      color: "var(--success)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: ".875rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {t("purchaseOrderDetail.receivedBy")} {r.user?.name || "—"}
                  </span>
                  {r.notes && (
                    <span
                      style={{ fontSize: ".75rem", color: "var(--text-muted)" }}
                    >
                      ({r.notes})
                    </span>
                  )}
                </div>
                <span
                  style={{ fontSize: ".75rem", color: "var(--text-muted)" }}
                >
                  {formatDate(r.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allReceived && po.status === "completed" && (
        <div
          style={{
            padding: "1.25rem",
            textAlign: "center",
            borderRadius: ".75rem",
            background: "color-mix(in srgb, var(--success) 8%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--success) 20%, transparent)",
          }}
        >
          <CheckCircle
            style={{
              width: "2rem",
              height: "2rem",
              color: "var(--success)",
              margin: "0 auto .5rem",
            }}
          />
          <p style={{ fontWeight: 600, color: "var(--success)" }}>
            {t("purchaseOrderDetail.allReceived")}
          </p>
          <p style={{ fontSize: ".875rem", color: "var(--text-muted)" }}>
            {t("purchaseOrderDetail.completed")}
          </p>
        </div>
      )}
    </div>
  );
}
