/**
 * Data Service
 */

let currentCafeId: string | null = null;

export const dataService = {
  setCafeId: (id: string) => {
    currentCafeId = id;
  },

  getHeaders: () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (currentCafeId) {
      headers["X-Cafe-Id"] = currentCafeId;
    }
    return headers;
  },

  createCafe: async (data: { id: string, name: string }) => {
    const res = await fetch("/api/cafes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getCafe: async (id: string) => {
    const res = await fetch(`/api/cafes/${id}`);
    if (!res.ok) throw new Error("Not Found");
    return res.json();
  },

  getMenu: async () => {
    const res = await fetch("/api/menu", { headers: dataService.getHeaders() });
    return res.json();
  },
  
  getAdminMenu: async () => {
    const res = await fetch("/api/admin/menu", { headers: dataService.getHeaders() });
    return res.json();
  },

  getOrders: async () => {
    const res = await fetch("/api/orders", { headers: dataService.getHeaders() });
    return res.json();
  },

  createOrder: async (orderData: any) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: dataService.getHeaders(),
      body: JSON.stringify(orderData)
    });
    return res.json();
  },

  updateOrderStatus: async (id: number, status: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: dataService.getHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  saveMenuItem: async (item: any) => {
    const method = item.id ? "PUT" : "POST";
    const url = item.id ? `/api/admin/menu/${item.id}` : "/api/admin/menu";
    const res = await fetch(url, {
      method,
      headers: dataService.getHeaders(),
      body: JSON.stringify(item)
    });
    return res.json();
  },

  deleteMenuItem: async (id: number) => {
    const res = await fetch(`/api/admin/menu/${id}`, { 
      method: "DELETE",
      headers: dataService.getHeaders()
    });
    return res.json();
  },

  getSettings: async () => {
    const res = await fetch("/api/settings", { headers: dataService.getHeaders() });
    return res.json();
  },

  updateSettings: async (key: string, value: string) => {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: dataService.getHeaders(),
      body: JSON.stringify({ key, value })
    });
    return res.json();
  },

  getStats: async () => {
    const res = await fetch("/api/admin/stats", { headers: dataService.getHeaders() });
    return res.json();
  }
};
