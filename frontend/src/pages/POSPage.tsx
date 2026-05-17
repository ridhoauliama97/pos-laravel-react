import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuthStore, useCartStore } from "../stores";
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
import { ConfirmDialog } from "../components/ConfirmDialog";
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

function getAvailableStock(product: Product): number {
  if (product.available_stock !== undefined) {
    return product.available_stock;
  }
  const variantStock =
    product.variants?.reduce((sum, variant) => sum + variant.stock, 0) ?? 0;
  return variantStock + (product.stock ?? 0);
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
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [cashError, setCashError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmCheckout, setConfirmCheckout] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const paymentRef = useRef<HTMLInputElement>(null);
  const methodRef = useRef<HTMLSelectElement>(null);
  const checkoutRef = useRef<HTMLButtonElement>(null);

  const cart = useCartStore();
  const clearCart = useCartStore((s) => s.clearCart);
  const branches = useAuthStore((s) => s.branches);
  const selectedBranchId = useAuthStore((s) => s.selectedBranchId);
  const queryClient = useQueryClient();

  const activeBranchName = useMemo(() => {
    const branch = branches.find((b) => b.id === selectedBranchId);
    return branch?.name ?? "";
  }, [branches, selectedBranchId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "Escape") {
        if (showReceipt) {
          setShowReceipt(null);
          return;
        }
        showCustomerDropdown && setShowCustomerDropdown(false);
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
        customerRef.current?.focus();
        setShowCustomerDropdown(true);
      }
      if (e.key === "F7") {
        e.preventDefault();
        if (cart.items.length > 0) {
          setConfirmClear(true);
        }
      }
      if (e.key === "Enter" && !isInput && showReceipt === null) {
        checkoutRef.current?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showReceipt, showCustomerDropdown, queryClient, clearCart, t]);

  const { data: productsData, isLoading: productsLoading } = useQuery({
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
    queryKey: ["customers-search", customerSearchTerm],
    queryFn: () =>
      api.get<Customer[]>(`/customers?search=${customerSearchTerm}&per_page=50`),
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
  useEffect(() => {
    if (categories.length > 0 && categoryId === "") {
      setCategoryId(String(categories[0].id));
    }
  }, [categories, categoryId]);
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
    if (paymentMethod === "cash") {
      if (!paymentAmount || paymentAmount <= 0) {
        setCashError(t("pos.cashRequired") || "Nominal tunai wajib diisi");
        return;
      }
      if (paymentAmount < finalTotal) {
        setCashError(t("pos.cashInsufficient"));
        return;
      }
    }
    setCashError("");
    setConfirmCheckout(true);
  };

  const executeCheckout = () => {
    setConfirmCheckout(false);
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
            aria-hidden
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
              <Printer className="w-4 h-4" /> {t("pos.print")}
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
          <div className="search-wrap pos-search-wrap">
            <Search className="w-4 h-4" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              name="pos_search"
              autoComplete="off"
              placeholder={t("pos.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              aria-label={t("pos.searchPlaceholder")}
            />
          </div>

          {/* Category Filter */}
          <div
            role="tablist"
            aria-label={t("pos.categoryFilter")}
            style={{
              display: "flex",
              gap: ".375rem",
              marginBottom: ".625rem",
              overflow: "auto",
              flexShrink: 0,
              paddingBottom: ".25rem",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={categoryId === String(cat.id)}
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
                        ? "var(--on-accent)"
                        : "var(--text-secondary)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "background .15s, color .15s, border-color .15s",
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
          <div className="pos-product-grid">
            {productsLoading ? (
              /* Loading Skeleton */
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pos-product-skeleton" aria-hidden>
                  <div className="pos-product-skeleton__media skeleton" />
                  <div className="pos-product-skeleton__body">
                    <div className="skeleton" style={{ height: '.875rem', width: '80%' }} />
                    <div className="skeleton" style={{ height: '1rem', width: '50%' }} />
                    <div className="skeleton" style={{ height: '.6875rem', width: '65%' }} />
                    <div className="skeleton" style={{ height: '.75rem', width: '40%', marginTop: 'auto' }} />
                  </div>
                </div>
              ))
            ) : products.length === 0 ? (
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
                const totalStock = getAvailableStock(product);
                const isLow = totalStock > 0 && totalStock <= product.min_stock;
                const isOut = totalStock === 0;
                const stockClass = isOut
                  ? "pos-product-card__stock--out"
                  : isLow
                    ? "pos-product-card__stock--low"
                    : "";
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => !isOut && addToCart(product)}
                    className={`pos-product-card${isOut ? " pos-product-card--disabled" : ""}`}
                      disabled={isOut}
                    aria-label={`${product.name || '—'} — ${formatCurrency(product.sell_price ?? 0)}${isOut ? ' (Habis)' : ''}`}
                    style={{
                      opacity: isOut ? 0.55 : 1,
                    }}
                  >
                    <div className="pos-product-card__media">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name ?? ""}
                          loading="lazy"
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
                            width: "2rem",
                            height: "2rem",
                            color: "var(--text-muted)",
                            opacity: 0.4,
                          }}
                          aria-hidden
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
                            background: "var(--accent-dark, #d97706)",
                            color: "#fff",
                            lineHeight: 1.2,
                          }}
                        >
                          {t("pos.stockLow")}
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
                            background: "var(--danger)",
                            color: "#fff",
                            lineHeight: 1.2,
                          }}
                        >
                          {t("pos.stockOut")}
                        </span>
                      )}
                    </div>
                    <div className="pos-product-card__body">
                      <p className="pos-product-card__name">
                        {product.name || "—"}
                      </p>
                      <p className="pos-product-card__price">
                        {formatCurrency(product.sell_price ?? 0)}
                      </p>
                      <p className={`pos-product-card__stock ${stockClass}`}>
                        {t("pos.stockAvailable")}
                        {activeBranchName ? ` (${activeBranchName})` : ""}: {" "}
                        <strong>
                          {totalStock}
                          {product.unit?.name ? ` ${product.unit.name}` : ""}
                        </strong>
                      </p>
                      {product.category?.name && (
                        <span className="pos-product-card__cat">
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
            width: "min(100%, 22rem)",
            maxWidth: "22rem",
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: ".35rem",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  lineHeight: 1.5,
                }}
              >
                <ShoppingCart style={{ width: "1rem", height: "1rem", flexShrink: 0 }} aria-hidden /> {t("pos.cartTitle")}
              </h3>
              <span
                style={{ fontSize: ".8125rem", color: "var(--text-muted)" }}
              >
                {cart.itemCount()} item
              </span>
            </div>
            <div className="search-wrap" style={{ position: "relative" }}>
              <Search aria-hidden />
              <input
                ref={customerRef}
                type="text"
                name="customer_search"
                autoComplete="off"
                placeholder={t("pos.searchCustomer")}
                value={customerSearchTerm}
                onChange={(e) => {
                  setCustomerSearchTerm(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                className="search-input"
                style={{ fontSize: ".8125rem", background: "var(--bg)" }}
                aria-label={t("pos.searchCustomer")}
              />
              {showCustomerDropdown && customers.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    maxHeight: "12rem",
                    overflow: "auto",
                    boxShadow: "var(--shadow-lg)",
                    marginTop: ".25rem",
                  }}
                >
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        cart.setCustomer(c.id);
                        setCustomerSearchTerm(c.name);
                        setShowCustomerDropdown(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: ".5rem .75rem",
                        background: cart.customerId === c.id ? "var(--accent-light)" : "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: ".8125rem",
                        color: "var(--text-primary)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      className="hover-row"
                    >
                      <span>{c.name}</span>
                      {c.phone && (
                        <span style={{ fontSize: ".6875rem", color: "var(--text-muted)" }}>
                          {c.phone}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                        {t("pos.bundleFree")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pos-cart__items">
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
                    className={`pos-cart-item${hasPromo ? " pos-cart-item--promo" : ""}`}
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
                        {bundlePromo ? t("pos.bundleLabel") : t("pos.promoLabel")}
                      </div>
                    )}
                    <div className="pos-cart-item__main">
                      <p className="pos-cart-item__name">{item.product_name}</p>
                      <p className="pos-cart-item__meta">
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
                            {t("pos.bundleFree")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="pos-cart-item__actions">
                      <div className="pos-cart-item__qty">
                        <button
                          type="button"
                          onClick={() =>
                            cart.updateQty(i, Math.max(1, item.qty - 1))
                          }
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span
                          style={{
                            minWidth: "1.5rem",
                            textAlign: "center",
                            fontSize: ".8125rem",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.updateQty(i, item.qty + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="pos-cart-item__subtotal">
                        {formatCurrency(item.subtotal - itemPromo * item.qty)}
                      </p>
                      <button
                        type="button"
                        className="pos-cart-item__remove"
                        onClick={() => cart.removeItem(i)}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pos-cart-footer">
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
              className="form-select" aria-label={t("pos.paymentMethod")}
            >
              <option value="cash">{t("pos.paymentMethods.cash")}</option>
              <option value="debit">{t("pos.paymentMethods.debit")}</option>
              <option value="credit">{t("pos.paymentMethods.credit")}</option>
              <option value="qris">{t("pos.paymentMethods.qris")}</option>
            </select>
            {paymentMethod === "cash" && (
              <div className="form-group" style={{ gap: '.25rem' }}>
                <input
                  ref={paymentRef}
                  type="text"
                  inputMode="decimal"
                  name="payment_amount"
                  autoComplete="off"
                  placeholder={t("pos.paymentAmount")}
                  value={paymentAmount || ""}
                  onChange={(e) => {
                    setPaymentAmount(Number(e.target.value));
                    setCashError("");
                  }}
                  className={`form-input${cashError ? ' form-input--error' : ''}`}
                  aria-invalid={!!cashError}
                  aria-describedby={cashError ? 'cash-error' : undefined}
                />
                {cashError && (
                  <p id="cash-error" className="form-error" role="alert">
                    {cashError}
                  </p>
                )}
              </div>
            )}
            <button
              ref={checkoutRef}
              type="button"
              onClick={handleCheckout}
              disabled={
                checkoutMutation.isPending || cart.items.length === 0
              }
              className="btn btn-primary pos-checkout-btn"
              aria-live="polite"
              aria-busy={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? (
                <><span className="spinner spinner-sm" aria-hidden />{" "}{t("pos.processing")}</>
              ) : (
                `${t("pos.payButton")} ${formatCurrency(finalTotal)}`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm: Clear Cart */}
      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          clearCart();
          toast.success(t("pos.cartCleared"));
        }}
        title={t("pos.clearCartTitle")}
        message={t("pos.clearCartMessage")}
        confirmLabel={t("pos.clearCartConfirm")}
        cancelLabel={t("common.cancel")}
        variant="danger"
      />

      {/* Confirm: Checkout */}
      <ConfirmDialog
        isOpen={confirmCheckout}
        onClose={() => setConfirmCheckout(false)}
        onConfirm={executeCheckout}
        title={t("pos.checkoutConfirmTitle")}
        message={`${t("pos.checkoutConfirmMessage")} ${formatCurrency(finalTotal)}?`}
        confirmLabel={t("pos.payButton")}
        cancelLabel={t("common.cancel")}
        variant="primary"
        loading={checkoutMutation.isPending}
      />
    </div>
  );
}
