/**
 * Data Service
 * Currently proxies requests to the local Express/SQLite backend.
 * This structure "makes space" for a Supabase client later.
 */

/* 
// Potential Supabase import:
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
*/

export const dataService = {
  getMenu: async () => {
    const res = await fetch("/api/menu");
    return res.json();
  },
  
  getAdminMenu: async () => {
    const res = await fetch("/api/admin/menu");
    return res.json();
  },

  getOrders: async () => {
    const res = await fetch("/api/orders");
    return res.json();
  },

  createOrder: async (orderData: any) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData)
    });
    return res.json();
  },

  updateOrderStatus: async (id: number, status: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // Admin methods
  saveMenuItem: async (item: any) => {
    const method = item.id ? "PUT" : "POST";
    const url = item.id ? `/api/admin/menu/${item.id}` : "/api/admin/menu";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    return res.json();
  },

  deleteMenuItem: async (id: number) => {
    const res = await fetch(`/api/admin/menu/${id}`, { method: "DELETE" });
    return res.json();
  }
};
