import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useCartStore } from "../stores";
import { formatCurrency } from "../lib/utils";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  Printer,
  Package,
  Tag,
  Percent,
} from "../components/icons";
import type {
  Product,
  Customer,
  Transaction,
  Promotion,
  Category,
} from "../types";
import { useT } from "../i18n";

interface AppliedPromotion {
  id: number;
  name: string;
  type: string;
  discount: number;
  isBundleQty?: boolean;
}

export default function POSPage() {
  const t = useT();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [showReceipt, setShowReceipt] = useState<{
    invoice: string;
    total: number;
    change: number;
  } | null>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);
  const paymentRef = useRef<HTMLInputElement>(null);
  const methodRef = useRef<HTMLSelectElement>(null);
  const checkoutRef = useRef<HTMLButtonElement>(null);

  const cart = useCartStore();
  const clearCart = useCartStore((s) => s.clearCart);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "Escape") {
        if (showReceipt) {
          setShowReceipt(null);
          return;
        }
        if (showCustomerSelect) {
          setShowCustomerSelect(false);
          return;
        }
      }
      if (e.key === "F1" || (e.key === "f" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "F2") {
        e.preventDefault();
        paymentRef.current?.focus();
      }
      if (e.key === "F3") {
        e.preventDefault();
        methodRef.current?.focus();
      }
      if (e.key === "F4") {
        e.preventDefault();
        checkoutRef.current?.click();
      }
      if (e.key === "F5") {
        e.preventDefault();
        if (!isInput) {
          queryClient.invalidateQueries({ queryKey: ["products-pos"] });
          toast.success(t("pos.refreshToast"));
        }
      }
      if (e.key === "F6") {
        e.preventDefault();
        setShowCustomerSelect(true);
      }
      if (e.key === "F7") {
        e.preventDefault();
        clearCart();
        toast.success(t("pos.cartCleared"));
      }
      if (e.key === "Enter" && !isInput && showReceipt === null) {
        checkoutRef.current?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showReceipt, showCustomerSelect, queryClient, clearCart, t]);

  const { data: productsData } = useQuery({
    queryKey: ["products-pos", search, categoryId],
    queryFn: () =>
      api.get<Product[]>(
        `/products?search=${search}&per_page=50${
          categoryId ? `&category_id=${categoryId}` : ""
        }`,
      ),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-pos"],
    queryFn: () => api.get<Category[]>("/categories?per_page=100"),
  });

  const { data: promotionsData } = useQuery({
    queryKey: ["promotions-active"],
    queryFn: () => api.get<Promotion[]>("/promotions/active"),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-search", customerSearch],
    queryFn: () =>
      api.get<Customer[]>(`/customers?search=${customerSearch}&per_page=10`),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      const cartSubtotal = cart.total();
      const perItemSpecific: number[] = [];

      const checkoutItems = cart.items.map((i, idx) => {
        let qty = i.qty;
        let bundleDiscount = 0;
        for (const promo of promotions) {
          if (promo.type === "bundle" && promo.items) {
            for (const pi of promo.items) {
              if (i.product_id === pi.product_id && i.qty >= 2) {
                const freeCount = Math.floor(i.qty / 2);
                qty = i.qty + freeCount;
                bundleDiscount += (pi.discount_value ?? promo.value) * freeCount;
              }
            }
          }
        }
        const specific = promoDiscountPerItem(i) * i.qty;
        perItemSpecific[idx] = specific + bundleDiscount;
        return { qty, bundleDiscount, specific, item: i };
      });

      const distributedSpecific = perItemSpecific.reduce((s, d) => s + d, 0);
      const remainingOrderDiscount = Math.max(0, totalPromoDiscount - distributedSpecific);

      return api.post("/pos/checkout", {
        items: checkoutItems.map(({ item, qty, bundleDiscount, specific }) => {
          const share = cartSubtotal > 0
            ? (item.price * item.qty) / cartSubtotal
            : 1 / cart.items.length;
          return {
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            qty,
            discount: item.discount + specific + bundleDiscount + remainingOrderDiscount * share,
          };
        }),
        customer_id: cart.customerId,
        payment_method: paymentMethod,
        payment_amount: paymentAmount || finalTotal,
        notes: cart.notes,
      });
    },
    onSuccess: (res) => {
      const trans = (res as any).data as Transaction;
      setShowReceipt({
        invoice: trans.invoice_no,
        total: trans.grand_total,
        change: trans.change_amount,
      });
      cart.clearCart();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(t("pos.checkoutSuccess"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];
  const promotions = promotionsData?.data || [];
  const customers = customersData?.data || [];

  const appliedPromotions = useMemo<AppliedPromotion[]>(() => {
    const results: AppliedPromotion[] = [];
    const subtotal = cart.total();

    for (const promo of promotions) {
      if (promo.min_purchase > 0 && subtotal < promo.min_purchase) continue;

      // Category-based promo: apply to all cart items in that category
      if (promo.category_id) {
        const matched = cart.items.filter(
          (i) => i.category_id === promo.category_id,
        );
        if (matched.length === 0) continue;

        let itemDiscount = 0;
        for (const item of matched) {
          if (promo.type === "percent") {
            itemDiscount += (item.price * item.qty * promo.value) / 100;
          } else if (promo.type === "fixed") {
            itemDiscount += promo.value;
          } else if (promo.type === "bundle") {
            itemDiscount += promo.value * Math.floor(item.qty / 2);
          }
        }
        if (itemDiscount > 0) {
          results.push({
            id: promo.id,
            name: promo.name,
            type: promo.type,
            discount: itemDiscount,
          });
        }
        continue;
      }

      // Product-specific promo via items[]
      if (promo.items && promo.items.length > 0) {
        let itemDiscount = 0;
        let bundleActive = false;
        for (const pi of promo.items) {
          const matched = cart.items.find(
            (i) =>
              i.product_id === pi.product_id &&
              (!pi.product_variant_id ||
                i.product_variant_id === pi.product_variant_id),
          );
          if (matched) {
            if (promo.type === "percent") {
              itemDiscount +=
                (matched.price * matched.qty * promo.value) / 100;
            } else if (promo.type === "fixed") {
              itemDiscount += pi.discount_value ?? promo.value;
            } else if (promo.type === "bundle" && matched.qty >= 2) {
              bundleActive = true;
            }
          }
        }
        if (itemDiscount > 0 || bundleActive) {
          results.push({
            id: promo.id,
            name: promo.name,
            type: promo.type,
            discount: itemDiscount,
            isBundleQty: bundleActive,
          });
        }
      } else {
        // Order-level promo (no category, no items)
        let discount = 0;
        if (promo.type === "percent") {
          discount = (subtotal * promo.value) / 100;
        } else if (promo.type === "fixed") {
          discount = promo.value;
        }
        if (discount > 0) {
          results.push({
            id: promo.id,
            name: promo.name,
            type: promo.type,
            discount,
          });
        }
      }
    }
    return results;
  }, [promotions, cart.items, cart]);

  const promoDiscountPerItem = useCallback(
    (item: (typeof cart.items)[0]) => {
      let discount = 0;
      for (const promo of promotions) {
        // Category-based promo
        if (promo.category_id) {
          if (item.category_id === promo.category_id) {
            if (promo.type === "percent") {
              discount += (item.price * promo.value) / 100;
            } else if (promo.type === "fixed") {
              discount += promo.value;
            } else if (promo.type === "bundle") {
              // Bundle hanya menambah qty di checkout, tidak mengurangi harga tampilan
            }
          }
          continue;
        }

        // Product-specific promo via items[]
        if (!promo.items || promo.items.length === 0) continue;
        for (const pi of promo.items) {
          if (
            item.product_id === pi.product_id &&
            (!pi.product_variant_id ||
              item.product_variant_id === pi.product_variant_id)
          ) {
            if (promo.type === "percent") {
              discount += (item.price * promo.value) / 100;
            } else if (promo.type === "fixed") {
              discount += pi.discount_value ?? promo.value;
            } else if (promo.type === "bundle") {
              // Bundle hanya menambah qty di checkout, tidak mengurangi harga tampilan
            }
          }
        }
      }
      return discount;
    },
    [promotions],
  );

  const hasBundlePromo = useCallback(
    (item: (typeof cart.items)[0]) => {
      for (const promo of promotions) {
        if (promo.type === "bundle" && promo.items) {
          for (const pi of promo.items) {
            if (item.product_id === pi.product_id && item.qty >= 2) {
              return true;
            }
          }
        }
      }
      return false;
    },
    [promotions],
  );

  const totalPromoDiscount = useMemo(
    () => appliedPromotions
      .filter((p) => !p.isBundleQty)
      .reduce((sum, p) => sum + p.discount, 0),
    [appliedPromotions],
  );

  const finalTotal = Math.max(0, cart.total() - totalPromoDiscount);

  const addToCart = useCallback(
    (product: Product, variant?: any) => {
      cart.addItem({
        product_id: product.id,
        product_variant_id: variant?.id,
        product_name: product.name,
        variant_name: variant?.name,
        category_id: product.category_id,
        price: Number(variant?.sell_price || product.sell_price),
        qty: 1,
        discount: 0,
        subtotal: Number(variant?.sell_price || product.sell_price),
      });
    },
    [cart],
  );

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      toast.error(t("pos.cartEmpty"));
      return;
    }
    checkoutMutation.mutate();
  };

  const handlePrint = () => window.print();

  if (showReceipt) {
    return (
      <div
        style={{
          maxWidth: "24rem",
          margin: "2rem auto",
          padding: "2rem",
          background: "var(--bg-card)",
          borderRadius: "1rem",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <Receipt
            style={{
              width: "3rem",
              height: "3rem",
              color: "var(--accent)",
              margin: "0 auto .5rem",
            }}
          />
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {t("pos.receiptTitle")}
          </h2>
          <p style={{ fontSize: ".8125rem", color: "var(--text-muted)" }}>
            {showReceipt.invoice}
          </p>
        </div>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <p
            style={{
              fontSize: "1.875rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {formatCurrency(showReceipt.total)}
          </p>
          <p style={{ fontSize: ".8125rem", color: "var(--text-muted)" }}>
            {t("pos.changeLabel")} {formatCurrency(showReceipt.change)}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".75rem" }}>
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
          >
            <Printer className="w-4 h-4" /> Cetak
          </button>
          <button
            onClick={() => setShowReceipt(null)}
            className="btn btn-ghost"
            style={{ flex: 1, justifyContent: "center" }}
          >
            {t("pos.shortcuts.close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        height: "100%",
      }}
      className="pos-layout"
    >
      <div
        style={{ display: "flex", gap: "1rem", flex: 1, minHeight: 0 }}
        className="pos-flex"
      >
        {/* Left: Search + Category Filter + Product Grid */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {/* Search */}
          <div style={{ marginBottom: ".5rem" }}>
            <div style={{ position: "relative" }}>
              <Search
                style={{
                  position: "absolute",
                  left: ".75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "1.25rem",
                  height: "1.25rem",
                  color: "var(--text-muted)",
                }}
              />
              <input
                ref={searchRef}
                type="text"
                placeholder="Cari produk (nama / SKU / barcode)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "2.5rem", width: "100%" }}
                autoFocus
              />
            </div>
          </div>

          {/* Category Filter */}
          <div
            style={{
              display: "flex",
              gap: ".375rem",
              marginBottom: ".625rem",
              overflow: "auto",
              flexShrink: 0,
              paddingBottom: ".25rem",
            }}
          >
            <button
              onClick={() => setCategoryId("")}
              style={{
                padding: ".35rem .75rem",
                borderRadius: "999px",
                fontSize: ".75rem",
                fontWeight: 500,
                border: "1px solid var(--border)",
                background:
                  categoryId === ""
                    ? "var(--accent)"
                    : "var(--bg-card)",
                color:
                  categoryId === ""
                    ? "#fff"
                    : "var(--text-secondary)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all .15s",
                flexShrink: 0,
              }}
            >
              {t("common.all")}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(String(cat.id))}
                style={{
                  padding: ".35rem .75rem",
                  borderRadius: "999px",
                  fontSize: ".75rem",
                  fontWeight: 500,
                  border: "1px solid var(--border)",
                  background:
                    categoryId === String(cat.id)
                      ? "var(--accent)"
                      : "var(--bg-card)",
                  color:
                    categoryId === String(cat.id)
                      ? "#fff"
                      : "var(--text-secondary)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all .15s",
                  flexShrink: 0,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Shortcuts */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: ".25rem",
              marginBottom: ".625rem",
              fontSize: ".625rem",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            {[
              ["F1", t("pos.shortcuts.search")],
              ["F2", t("pos.shortcuts.pay")],
              ["F3", t("pos.shortcuts.method")],
              ["F4", t("pos.shortcuts.checkout")],
              ["F5", t("pos.shortcuts.refresh")],
              ["F6", t("pos.shortcuts.customer")],
              ["F7", t("pos.shortcuts.clear")],
              ["Esc", t("pos.shortcuts.close")],
            ].map(([k, v]) => (
              <span
                key={k}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: ".125rem",
                }}
              >
                <kbd
                  style={{
                    padding: "0 .25rem",
                    background: "var(--bg-secondary)",
                    borderRadius: "3px",
                    fontFamily: "monospace",
                    fontSize: ".625rem",
                  }}
                >
                  {k}
                </kbd>
                {v}
              </span>
            ))}
          </div>

          {/* Product Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: ".875rem",
              overflow: "auto",
              flex: 1,
              alignContent: "start",
            }}
          >
            {products.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "3rem 0",
                  color: "var(--text-muted)",
                }}
              >
                {t("pos.noProducts")}
              </div>
            ) : (
              products.map((product) => {
                const totalStock =
                  product.variants?.reduce((s, v) => s + v.stock, 0) ?? 0;
                const isLow = totalStock > 0 && totalStock <= product.min_stock;
                const isOut = totalStock === 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => !isOut && addToCart(product)}
                    className="card"
                    style={{
                      padding: 0,
                      textAlign: "left",
                      cursor: isOut ? "not-allowed" : "pointer",
                      transition: "all .2s ease",
                      border: isOut
                        ? "1px solid var(--border)"
                        : "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: "0",
                      overflow: "hidden",
                      opacity: isOut ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isOut) {
                        e.currentTarget.style.borderColor =
                          "var(--accent)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 12px rgba(0,0,0,0.1)";
                        e.currentTarget.style.transform =
                          "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                      width: "100%",
                      height: "9rem",
                      background: "var(--bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform .3s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.08)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        />
                      ) : (
                        <Package
                          style={{
                            width: "2.5rem",
                            height: "2.5rem",
                            color: "var(--text-muted)",
                            opacity: 0.4,
                          }}
                        />
                      )}
                      {isLow && !isOut && (
                        <span
                          style={{
                            position: "absolute",
                            top: ".35rem",
                            left: ".35rem",
                            fontSize: ".5625rem",
                            fontWeight: 700,
                            padding: ".1rem .35rem",
                            borderRadius: "4px",
                            background: "#f59e0b",
                            color: "#fff",
                            lineHeight: 1.2,
                          }}
                        >
                          LOW
                        </span>
                      )}
                      {isOut && (
                        <span
                          style={{
                            position: "absolute",
                            top: ".35rem",
                            left: ".35rem",
                            fontSize: ".5625rem",
                            fontWeight: 700,
                            padding: ".1rem .35rem",
                            borderRadius: "4px",
                            background: "#ef4444",
                            color: "#fff",
                            lineHeight: 1.2,
                          }}
                        >
                          HABIS
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        padding: ".625rem .75rem .75rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: ".25rem",
                        flex: 1,
                      }}
                    >
                      <p
                        style={{
                          fontSize: ".875rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {product.name}
                      </p>
                      <p
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: "var(--accent)",
                          marginTop: ".125rem",
                        }}
                      >
                        {formatCurrency(product.sell_price)}
                      </p>
                      {product.category?.name && (
                        <span
                          style={{
                            fontSize: ".625rem",
                            color: "var(--text-muted)",
                            marginTop: ".125rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {product.category.name}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div
          className="card pos-cart"
          style={{
            width: "22rem",
            display: "flex",
            flexDirection: "column",
            padding: 0,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "1rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: ".5rem",
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
                <ShoppingCart className="w-5 h-5" /> {t("pos.cartTitle")}
              </h3>
              <span
                style={{ fontSize: ".8125rem", color: "var(--text-muted)" }}
              >
                {cart.itemCount()} item
              </span>
            </div>
            <button
              onClick={() => setShowCustomerSelect(true)}
              style={{
                width: "100%",
                textAlign: "left",
                fontSize: ".8125rem",
                color: "var(--text-muted)",
                padding: ".25rem 0",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {cart.customerId
                ? t("pos.shortcuts.customer") +
                  ": " +
                  (customers.find((c) => c.id === cart.customerId)?.name ??
                    t("pos.reselectCustomer"))
                : t("pos.addCustomer")}
            </button>

            {/* Active Promotions */}
            {appliedPromotions.length > 0 && (
              <div
                style={{
                  marginTop: ".5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: ".25rem",
                }}
              >
                {appliedPromotions.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".375rem",
                      fontSize: ".75rem",
                      padding: ".3rem .5rem",
                      borderRadius: "6px",
                      background: "var(--accent-light)",
                      color: "var(--accent)",
                      fontWeight: 500,
                    }}
                  >
                    {p.type === "percent" ? (
                      <Percent className="w-3 h-3" />
                    ) : (
                      <Tag className="w-3 h-3" />
                    )}
                    <span style={{ flex: 1, minWidth: 0 }}>{p.name}</span>
                    {p.discount > 0 && (
                      <span style={{ fontWeight: 700, flexShrink: 0 }}>
                        -{formatCurrency(p.discount)}
                      </span>
                    )}
                    {p.isBundleQty && (
                      <span style={{ fontWeight: 700, flexShrink: 0, fontSize: ".625rem" }}>
                        +1 GRATIS
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: ".5rem",
            }}
          >
            {cart.items.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  padding: "2rem 0",
                }}
              >
                {t("pos.cartEmptyDesc")}
              </p>
            ) : (
              cart.items.map((item, i) => {
                const itemPromo = promoDiscountPerItem(item);
                const bundlePromo = hasBundlePromo(item);
                const hasPromo = itemPromo > 0 || bundlePromo;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".625rem",
                      padding: ".5rem",
                      background: hasPromo
                        ? "var(--accent-light)"
                        : "var(--bg-secondary)",
                      borderRadius: "8px",
                      position: "relative",
                    }}
                  >
                    {hasPromo && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-.25rem",
                          right: "-.25rem",
                          background: "var(--accent)",
                          color: "#fff",
                          fontSize: ".5625rem",
                          fontWeight: 700,
                          padding: ".1rem .35rem",
                          borderRadius: "4px",
                          lineHeight: 1.2,
                        }}
                      >
                        {bundlePromo ? "B2G1" : "PROMO"}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: ".8125rem",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.product_name}
                      </p>
                      <p
                        style={{
                          fontSize: ".75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {formatCurrency(item.price)}
                        {itemPromo > 0 && (
                          <span
                            style={{
                              color: "var(--accent)",
                              fontWeight: 600,
                              marginLeft: ".375rem",
                            }}
                          >
                            -{formatCurrency(itemPromo)}
                          </span>
                        )}
                        {bundlePromo && (
                          <span
                            style={{
                              color: "var(--accent)",
                              fontWeight: 600,
                              marginLeft: ".375rem",
                            }}
                          >
                            +1 GRATIS
                          </span>
                        )}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: ".125rem",
                      }}
                    >
                      <button
                        onClick={() =>
                          cart.updateQty(i, Math.max(1, item.qty - 1))
                        }
                        style={{
                          padding: ".25rem",
                          borderRadius: "4px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span
                        style={{
                          width: "1.5rem",
                          textAlign: "center",
                          fontSize: ".8125rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.qty}
                      </span>
                      <button
                        onClick={() => cart.updateQty(i, item.qty + 1)}
                        style={{
                          padding: ".25rem",
                          borderRadius: "4px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p
                      style={{
                        fontSize: ".8125rem",
                        fontWeight: 600,
                        width: "5rem",
                        textAlign: "right",
                        color: "var(--text-primary)",
                      }}
                    >
                      {formatCurrency(item.subtotal - itemPromo * item.qty)}
                    </p>
                    <button
                      onClick={() => cart.removeItem(i)}
                      style={{
                        padding: ".25rem",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--danger)",
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              padding: "1rem",
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: ".75rem",
            }}
          >
            {/* Original Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: ".8125rem",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>
                {t("pos.subtotal")}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                {formatCurrency(cart.total())}
              </span>
            </div>

            {/* Promo Discount */}
            {totalPromoDiscount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: ".8125rem",
                }}
              >
                <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                  {t("pos.discount")}
                </span>
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                  -{formatCurrency(totalPromoDiscount)}
                </span>
              </div>
            )}

            {/* Final Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.125rem",
                fontWeight: 700,
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>
                {t("pos.total")}
              </span>
              <span style={{ color: "var(--accent)" }}>
                {formatCurrency(finalTotal)}
              </span>
            </div>

            <select
              ref={methodRef}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="form-input"
            >
              <option value="cash">{t("pos.paymentMethods.cash")}</option>
              <option value="debit">{t("pos.paymentMethods.debit")}</option>
              <option value="credit">{t("pos.paymentMethods.credit")}</option>
              <option value="qris">{t("pos.paymentMethods.qris")}</option>
            </select>
            {paymentMethod === "cash" && (
              <input
                ref={paymentRef}
                type="number"
                placeholder={t("pos.paymentAmount")}
                value={paymentAmount || ""}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="form-input"
              />
            )}
            <button
              ref={checkoutRef}
              onClick={handleCheckout}
              disabled={
                checkoutMutation.isPending || cart.items.length === 0
              }
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: ".75rem",
              }}
            >
              {checkoutMutation.isPending
                ? "Memproses..."
                : `${t("pos.payButton")} ${formatCurrency(finalTotal)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Customer Select Modal */}
      {showCustomerSelect && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCustomerSelect(false)}
        >
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "28rem" }}
          >
            <h3
              style={{
                fontWeight: 600,
                marginBottom: "1rem",
                color: "var(--text-primary)",
              }}
            >
              {t("pos.selectCustomer")}
            </h3>
            <input
              type="text"
              placeholder={t("pos.searchCustomer")}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="form-input"
              autoFocus
              style={{ marginBottom: ".75rem" }}
            />
            <div
              style={{
                maxHeight: "15rem",
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: ".25rem",
              }}
            >
              {customers.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    padding: "1rem 0",
                  }}
                >
                  {t("pos.noCustomers")}
                </p>
              ) : (
                customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      cart.setCustomer(c.id);
                      setShowCustomerSelect(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: ".75rem",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                    }}
                    className="hover-row"
                  >
                    <p style={{ fontSize: ".8125rem", fontWeight: 500 }}>
                      {c.name}
                    </p>
                    <p
                      style={{
                        fontSize: ".75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {c.phone || "-"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
