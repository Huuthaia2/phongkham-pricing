import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const today = () => new Date().toISOString().slice(0, 10)

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, cart: [], calcResult: null, currentQuoteId: null }),

      // ── Navigation ────────────────────────────────────
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      currentQuoteId: null,
      setCurrentQuoteId: (id) => set({ currentQuoteId: id }),

      // ── Customer form ─────────────────────────────────
      customer: {
        name: '', phone: '', branch: 'CS-01',
        consultDate: today(), hasBirthday: false,
        groupCount: 1, specialType: 'none', note: '',
      },
      setCustomer: (updates) => set(s => ({ customer: { ...s.customer, ...updates } })),
      resetCustomer: () => set({
        customer: {
          name: '', phone: '', branch: 'CS-01',
          consultDate: today(), hasBirthday: false,
          groupCount: 1, specialType: 'none', note: '',
        }
      }),

      // ── Cart ──────────────────────────────────────────
      cart: [],
      addToCart: (svc) => set(s => {
        if (s.cart.find(i => i.serviceId === svc.MaDichVu)) return s
        return { cart: [...s.cart, { serviceId: svc.MaDichVu, quantity: 1, _svc: svc }] }
      }),
      removeFromCart: (id) => set(s => ({ cart: s.cart.filter(i => i.serviceId !== id) })),
      updateQty: (id, qty) => set(s => ({
        cart: s.cart.map(i => i.serviceId === id ? { ...i, quantity: Math.max(1, qty) } : i)
      })),
      clearCart: () => set({ cart: [], calcResult: null }),

      // ── Calc result ───────────────────────────────────
      calcResult: null,
      setCalcResult: (r) => set({ calcResult: r }),

      // ── Quotes list refresh signal ─────────────────────
      quotesVersion: 0,
      bumpQuotesVersion: () => set(s => ({ quotesVersion: s.quotesVersion + 1 })),
    }),
    {
      name: 'pk-store',
      partialize: (s) => ({ user: s.user, customer: s.customer }),
    }
  )
)
