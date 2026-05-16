export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // POS
  POS_ACCESS: 'pos.access',
  POS_HISTORY: 'pos.history',

  // Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',

  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_MANAGE: 'categories.manage',

  // Units
  UNITS_MANAGE: 'units.manage',

  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',

  // Suppliers
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_MANAGE: 'suppliers.manage',

  // Stock
  STOCK_VIEW: 'stock.view',
  STOCK_MUTATIONS: 'stock.mutations',
  STOCK_ADJUSTMENTS: 'stock.adjustments',

  // Purchase Orders
  PURCHASE_ORDERS_VIEW: 'purchase_orders.view',
  PURCHASE_ORDERS_CREATE: 'purchase_orders.create',
  PURCHASE_ORDERS_EDIT: 'purchase_orders.edit',
  PURCHASE_ORDERS_DELETE: 'purchase_orders.delete',

  // Reports
  REPORTS_VIEW: 'reports.view',

  // Settings
  SETTINGS_ACCESS: 'settings.access',
  SETTINGS_COMPANY: 'settings.company',
  SETTINGS_USERS: 'settings.users',
  SETTINGS_BRANCHES: 'settings.branches',
  SETTINGS_PROMOTIONS: 'settings.promotions',
  SETTINGS_ROLES: 'settings.roles',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]
