import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import toast from "react-hot-toast";
import {
  Upload,
  X,
  Package,
  ArrowLeft,
  Save,
} from "../components/icons";
import type { Product } from "../types";
import { useT } from "../i18n";
import { SearchSelect } from "../components/SearchSelect";

export default function ProductFormPage() {
  const t = useT();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    category_id: "",
    unit_id: "",
    buy_price: 0,
    sell_price: 0,
    min_stock: 0,
    is_active: true,
    variants: [] as {
      name: string;
      sku: string;
      buy_price: number;
      sell_price: number;
      stock: number;
    }[],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: isEdit,
  });

  const product = productData?.data;

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku || "",
        barcode: product.barcode || "",
        category_id: String(product.category_id || ""),
        unit_id: String(product.unit_id || ""),
        buy_price: product.buy_price,
        sell_price: product.sell_price,
        min_stock: product.min_stock,
        is_active: product.is_active,
        variants:
          product.variants?.map((v) => ({
            name: v.name,
            sku: v.sku || "",
            buy_price: v.buy_price,
            sell_price: v.sell_price,
            stock: v.stock,
          })) || [],
      });
      setImagePreview(product.image || null);
    }
  }, [product]);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<any[]>("/categories?per_page=100"),
  });

  const { data: unitsData } = useQuery({
    queryKey: ["units"],
    queryFn: () => api.get<any[]>("/units"),
  });

  const categories = categoriesData?.data || [];
  const units = unitsData?.data || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const hasFile = !!imageFile;
      if (hasFile) {
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("buy_price", String(form.buy_price));
        fd.append("sell_price", String(form.sell_price));
        fd.append("min_stock", String(form.min_stock));
        fd.append("is_active", form.is_active ? "1" : "0");
        if (form.sku) fd.append("sku", form.sku);
        if (form.barcode) fd.append("barcode", form.barcode);
        if (form.category_id) fd.append("category_id", String(form.category_id));
        if (form.unit_id) fd.append("unit_id", String(form.unit_id));
        if (form.min_stock > 0) fd.append("min_stock", String(form.min_stock));
        fd.append("image", imageFile!);
        if (form.variants.length > 0) {
          fd.append("variants", JSON.stringify(form.variants));
        }
        if (isEdit) {
          fd.append("_method", "PUT");
          return api.upload<Product>(`/products/${id}`, fd);
        }
        return api.upload<Product>("/products", fd);
      }

      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        unit_id: form.unit_id ? Number(form.unit_id) : null,
      } as Record<string, unknown>;

      if (isEdit && !imagePreview && imageFile === null) {
        payload.image = "";
      }

      return isEdit
        ? api.put<Product>(`/products/${id}`, payload)
        : api.post<Product>("/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products-stats"] });
      toast.success(isEdit ? t("products.updated") : t("products.created"));
      navigate("/products");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (isEdit && isLoadingProduct) {
    return (
      <div className="page-container">
        <div className="card card-body" style={{ textAlign: "center", padding: "3rem" }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (isEdit && !product && !isLoadingProduct) {
    return (
      <div className="page-container">
        <div
          className="card card-body"
          style={{ textAlign: "center", color: "#dc2626", padding: "3rem" }}
        >
          {t("errors.loadFailed")}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: "48rem" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <button
            onClick={() => navigate("/products")}
            className="btn-icon"
            style={{ flexShrink: 0 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">
              {isEdit ? t("products.editTitle") : t("products.addTitle")}
            </h1>
            <p className="page-subtitle">{t("products.subtitle")}</p>
          </div>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit}>
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Image */}
          <div className="form-group">
            <label className="form-label">{t("products.form.productImage")}</label>
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: "6rem",
                  height: "6rem",
                  borderRadius: "0.75rem",
                  border: "2px dashed var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                  background: "var(--bg)",
                  flexShrink: 0,
                }}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      style={{
                        position: "absolute",
                        top: "0.25rem",
                        right: "0.25rem",
                        width: "1.5rem",
                        height: "1.5rem",
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <Package className="w-8 h-8" style={{ opacity: 0.3 }} />
                )}
              </div>
              <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
                <Upload className="w-4 h-4" />
                {imagePreview ? t("common.change") : t("common.chooseFile")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {/* Active */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
              cursor: "pointer",
              fontSize: ".875rem",
              color: "var(--text-primary)",
              padding: ".5rem 0",
            }}
          >
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => handleFieldChange("is_active", e.target.checked)}
              className="form-checkbox"
              style={{ width: "1.125rem", height: "1.125rem" }}
            />
            {t("products.form.isActive")}
          </label>

          {/* Name */}
          <div className="form-group">
            <label className="form-label">{t("products.form.productName")}</label>
            <input
              required
              value={form.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className="form-input"
              placeholder={t("products.form.productNamePlaceholder")}
            />
          </div>

          {/* SKU + Barcode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">{t("products.form.sku")}</label>
              <input
                value={form.sku}
                onChange={(e) => handleFieldChange("sku", e.target.value)}
                className="form-input"
                placeholder={t("products.form.skuPlaceholder")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("products.form.barcode")}</label>
              <input
                value={form.barcode}
                onChange={(e) => handleFieldChange("barcode", e.target.value)}
                className="form-input"
                placeholder="123456789"
              />
            </div>
          </div>

          {/* Category + Unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SearchSelect
              label={t("products.form.category")}
              options={categories}
              value={form.category_id}
              onChange={(v) => handleFieldChange("category_id", v)}
              placeholder={t("products.form.categoryPlaceholder")}
            />
            <SearchSelect
              label={t("products.form.unit")}
              options={units}
              value={form.unit_id}
              onChange={(v) => handleFieldChange("unit_id", v)}
              placeholder={t("products.form.unitPlaceholder")}
            />
          </div>

          {/* Buy + Sell Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">{t("products.form.buyPrice")}</label>
              <input
                type="number"
                required
                value={form.buy_price}
                onChange={(e) => handleFieldChange("buy_price", Number(e.target.value))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("products.form.sellPrice")}</label>
              <input
                type="number"
                required
                value={form.sell_price}
                onChange={(e) => handleFieldChange("sell_price", Number(e.target.value))}
                className="form-input"
              />
            </div>
          </div>

          {/* Min Stock */}
          <div className="form-group">
            <label className="form-label">{t("products.form.minStock")}</label>
            <input
              type="number"
              value={form.min_stock}
              onChange={(e) => handleFieldChange("min_stock", Number(e.target.value))}
              className="form-input"
            />
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: ".5rem", minWidth: "8rem", justifyContent: "center" }}
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
