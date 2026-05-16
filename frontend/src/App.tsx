import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useAuthStore } from "./stores";
import AppLayout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import POSPage from "./pages/POSPage";
import ProductsPage from "./pages/ProductsPage";
import ProductFormPage from "./pages/ProductFormPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerFormPage from "./pages/CustomerFormPage";
import SuppliersPage from "./pages/SuppliersPage";
import SupplierFormPage from "./pages/SupplierFormPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import BranchesPage from "./pages/BranchesPage";
import PromotionsPage from "./pages/PromotionsPage";
import RolesPage from "./pages/RolesPage";
import CategoriesPage from "./pages/CategoriesPage";
import UnitsPage from "./pages/UnitsPage";
import PosHistoryPage from "./pages/PosHistoryPage";
import StockMutationsPage from "./pages/StockMutationsPage";
import StockAdjustmentPage from "./pages/StockAdjustmentPage";
import StockAdjustmentFormPage from "./pages/StockAdjustmentFormPage";
import UserFormPage from "./pages/UserFormPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import PurchaseOrderDetailPage from "./pages/PurchaseOrderDetailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
    }
  }, [isAuthenticated, loadUser]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/pos/history" element={<PosHistoryPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/new" element={<ProductFormPage />} />
            <Route path="/products/:id/edit" element={<ProductFormPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/units" element={<UnitsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/new" element={<CustomerFormPage />} />
            <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/suppliers/new" element={<SupplierFormPage />} />
            <Route path="/suppliers/:id/edit" element={<SupplierFormPage />} />
            <Route path="/stock/mutations" element={<StockMutationsPage />} />
            <Route
              path="/stock/adjustments"
              element={<StockAdjustmentPage />}
            />
            <Route
              path="/stock/adjustments/new"
              element={<StockAdjustmentFormPage />}
            />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route
              path="/purchase-orders/:id"
              element={<PurchaseOrderDetailPage />}
            />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/users" element={<UsersPage />} />
            <Route path="/settings/users/new" element={<UserFormPage />} />
            <Route path="/settings/users/:id/edit" element={<UserFormPage />} />
            <Route path="/settings/branches" element={<BranchesPage />} />
            <Route path="/settings/promotions" element={<PromotionsPage />} />
            <Route path="/settings/roles" element={<RolesPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: "14px" },
        }}
      />
    </QueryClientProvider>
  );
}
