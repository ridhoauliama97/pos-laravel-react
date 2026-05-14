import { create } from "zustand";
import type { User, CartItem, Tenant } from "../types";
import { api, setToken, setBranchId } from "../services/api";

interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  status: string;
}

interface AuthState {
  user: User | null;
  tenant:
    | (Pick<Tenant, "name" | "logo" | "currency" | "currency_symbol"> & {
        favicon?: string | null;
        timezone?: string;
        language?: string;
        date_format?: string;
      })
    | null;
  isAuthenticated: boolean;
  selectedBranchId: number | null;
  branches: Branch[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setSelectedBranch: (id: number) => void;
  loadBranches: () => Promise<void>;
  setTenant: (data: AuthState["tenant"]) => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  isAuthenticated: !!localStorage.getItem("token"),
  selectedBranchId: Number(localStorage.getItem("selectedBranchId")) || null,
  branches: [],

  login: async (email, password) => {
    const res = await api.post<{ user: User; token: string }>("/login", {
      email,
      password,
    });
    setToken(res.data.token);
    set({ user: res.data.user, isAuthenticated: true });
    const defaultBranchId = res.data.user.branch_id;
    if (res.data.user.role === "super_admin") {
      setBranchId(defaultBranchId);
      set({ selectedBranchId: defaultBranchId });
      get().loadBranches();
    } else {
      setBranchId(defaultBranchId);
      set({ selectedBranchId: defaultBranchId });
    }
  },

  logout: async () => {
    try {
      await api.post("/logout");
    } catch {
      // ignore
    }
    setToken(null);
    setBranchId(null);
    set({
      user: null,
      tenant: null,
      isAuthenticated: false,
      selectedBranchId: null,
      branches: [],
    });
  },

  loadUser: async () => {
    try {
      const res = await api.get<User>("/me");
      set({ user: res.data, isAuthenticated: true });
      const storedId = Number(localStorage.getItem("selectedBranchId"));
      if (res.data.role === "super_admin") {
        if (storedId) {
          setBranchId(storedId);
          set({ selectedBranchId: storedId });
        } else {
          setBranchId(res.data.branch_id);
          set({ selectedBranchId: res.data.branch_id });
        }
        get().loadBranches();
      } else {
        setBranchId(res.data.branch_id);
        set({ selectedBranchId: res.data.branch_id });
      }
    } catch {
      setToken(null);
      setBranchId(null);
      set({
        user: null,
        tenant: null,
        isAuthenticated: false,
        selectedBranchId: null,
        branches: [],
      });
    }
  },

  setSelectedBranch: (id) => {
    setBranchId(id);
    set({ selectedBranchId: id });
  },

  loadBranches: async () => {
    try {
      const res = await api.get<Branch[]>("/branches");
      set({ branches: res.data });
    } catch {
      // silent
    }
  },

  setTenant: (data) => set({ tenant: data }),

  updateUser: (data) => {
    const user = get().user;
    if (user) set({ user: { ...user, ...data } });
  },
}));

interface CartState {
  items: CartItem[];
  customerId: number | null;
  notes: string;
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQty: (index: number, qty: number) => void;
  updateDiscount: (index: number, discount: number) => void;
  setCustomer: (id: number | null) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  notes: "",

  addItem: (item) => {
    const items = get().items;
    const existing = items.findIndex(
      (i) =>
        i.product_id === item.product_id &&
        i.product_variant_id === item.product_variant_id,
    );

    if (existing >= 0) {
      const updated = [...items];
      updated[existing] = {
        ...updated[existing],
        qty: updated[existing].qty + item.qty,
        subtotal:
          updated[existing].price * (updated[existing].qty + item.qty) -
          updated[existing].discount,
      };
      set({ items: updated });
    } else {
      set({
        items: [
          ...items,
          { ...item, subtotal: item.price * item.qty - item.discount },
        ],
      });
    }
  },

  removeItem: (index) => {
    set({ items: get().items.filter((_, i) => i !== index) });
  },

  updateQty: (index, qty) => {
    const items = [...get().items];
    items[index] = {
      ...items[index],
      qty,
      subtotal: items[index].price * qty - items[index].discount,
    };
    set({ items });
  },

  updateDiscount: (index, discount) => {
    const items = [...get().items];
    items[index] = {
      ...items[index],
      discount,
      subtotal: items[index].price * items[index].qty - discount,
    };
    set({ items });
  },

  setCustomer: (id) => set({ customerId: id }),
  setNotes: (notes) => set({ notes }),
  clearCart: () => set({ items: [], customerId: null, notes: "" }),
  total: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}));
