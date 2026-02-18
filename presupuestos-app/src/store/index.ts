import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Client, Product } from '@/types';

// ============================================
// Clients Store
// ============================================
interface ClientsState {
  clients: Client[];
  selectedClient: Client | null;
  isLoading: boolean;
  error: string | null;
  setClients: (clients: Client[]) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  selectClient: (client: Client | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useClientsStore = create<ClientsState>()(
  devtools(
    (set) => ({
      clients: [],
      selectedClient: null,
      isLoading: false,
      error: null,
      setClients: (clients) => set({ clients }),
      addClient: (client) => set((state) => ({ 
        clients: [...state.clients, client] 
      })),
      updateClient: (id, updates) => set((state) => ({
        clients: state.clients.map((c) => 
          c.id === id ? { ...c, ...updates } : c
        ),
        selectedClient: state.selectedClient?.id === id 
          ? { ...state.selectedClient, ...updates }
          : state.selectedClient
      })),
      selectClient: (client) => set({ selectedClient: client }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    { name: 'clients-store' }
  )
);

// ============================================
// Products Store
// ============================================
interface ProductsState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  addProducts: (products: Product[]) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProductsStore = create<ProductsState>()(
  devtools(
    (set) => ({
      products: [],
      isLoading: false,
      error: null,
      setProducts: (products) => set({ products }),
      addProduct: (product) => set((state) => ({ 
        products: [...state.products, product] 
      })),
      addProducts: (products) => set((state) => ({ 
        products: [...state.products, ...products] 
      })),
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map((p) => 
          p.id === id ? { ...p, ...updates } : p
        )
      })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    { name: 'products-store' }
  )
);

// ============================================
// UI Store (sidebar, modals, etc)
// ============================================
interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeModal: null,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      openModal: (activeModal) => set({ activeModal }),
      closeModal: () => set({ activeModal: null }),
    }),
    { 
      name: 'ui-store',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    }
  )
);
