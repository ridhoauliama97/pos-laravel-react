export interface User {
  id: number;
  tenant_id: number;
  branch_id: number;
  name: string;
  email: string;
  role: "super_admin" | "admin_cabang" | "kasir" | "gudang";
  is_active: boolean;
  avatar?: string | null;
  phone?: string | null;
  address?: string | null;
  permissions?: string[];
  tenant?: Tenant;
  branch?: Branch;
}

export interface Tenant {
  id: number;
  name: string;
  domain: string;
  status: string;
  currency?: string;
  currency_symbol?: string;
  language?: string;
  timezone?: string;
  date_format?: string;
  logo?: string | null;
  favicon?: string | null;
}

export interface Branch {
  id: number;
  tenant_id: number;
  name: string;
  address?: string;
  phone?: string;
  status: string;
  users_count?: number;
}

export interface Product {
  id: number;
  tenant_id: number;
  category_id?: number;
  unit_id?: number;
  name: string;
  sku?: string;
  barcode?: string;
  buy_price: number;
  sell_price: number;
  min_stock: number;
  stock?: number;
  is_active: boolean;
  image?: string;
  category?: Category;
  unit?: Unit;
  variants?: ProductVariant[];
  created_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  sku?: string;
  buy_price: number;
  sell_price: number;
  stock: number;
}

export interface Category {
  id: number;
  tenant_id: number;
  name: string;
  slug?: string;
  products_count?: number;
}

export interface Unit {
  id: number;
  name: string;
  short?: string;
}

export interface Customer {
  id: number;
  tenant_id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  is_member: boolean;
  points: number;
  member_tier: string;
  total_spent?: number;
  created_at: string;
}

export interface CustomerStats {
  total: number;
  active: number;
  member: number;
  has_transactions: number;
}

export interface Supplier {
  id: number;
  tenant_id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  opening_balance: number;
  is_active: boolean;
}

export interface Transaction {
  id: number;
  tenant_id: number;
  branch_id: number;
  user_id: number;
  customer_id?: number;
  invoice_no: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  payment_method: string;
  payment_amount: number;
  change_amount: number;
  status: string;
  notes?: string;
  items?: TransactionItem[];
  user?: User;
  customer?: Customer;
  created_at: string;
}

export interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id?: number;
  product_variant_id?: number;
  product_name: string;
  variant_name?: string;
  price: number;
  buy_price: number;
  qty: number;
  discount: number;
  subtotal: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors?: Record<string, string[]>;
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface CartItem {
  product_id: number;
  product_variant_id?: number;
  product_name: string;
  variant_name?: string;
  category_id?: number | null;
  price: number;
  qty: number;
  discount: number;
  subtotal: number;
}

export interface DashboardSummary {
  today_sales: number;
  today_transactions: number;
  total_products: number;
  total_customers: number;
  this_month_sales: number;
  last_month_sales: number;
  sales_growth_percent: number;
  sales_chart: { date: string; total: number; count: number }[];
  recent_transactions: Transaction[];
  top_products: {
    product_name: string;
    total_qty: number;
    total_revenue: number;
  }[];
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface SalesReport {
  total_sales: number;
  total_transactions: number;
  total_items_sold: number;
  average_transaction: number;
  daily_sales: { date: string; total: number; count: number }[];
}

export interface ProfitLossReport {
  total_sales: number;
  total_cogs: number;
  gross_profit: number;
  margin_percent: number;
  transaction_count: number;
}

export interface Promotion {
  id: number;
  tenant_id: number;
  name: string;
  category_id?: number | null;
  category?: Category | null;
  type: string;
  value: number;
  min_purchase: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  items?: PromotionItem[];
}

export interface PromotionItem {
  id: number;
  promotion_id: number;
  product_id: number;
  product_variant_id?: number;
  discount_value?: number;
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  group: string;
}

export interface UserActivityLog {
  id: number;
  tenant_id: number;
  user_id: number;
  action: string;
  description: string | null;
  ip_address: string | null;
  created_at: string;
  user?: User;
}

export interface Role {
  id: number;
  tenant_id: number;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  permissions?: Permission[];
}
