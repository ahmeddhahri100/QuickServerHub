// src/lib/types.ts
export interface Cafe {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  address?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface CafeTable {
  id: string;
  cafe_id: string;
  table_number: number;
  label?: string;
}

export interface MenuCategory {
  id: string;
  cafe_id: string;
  name: string;
  display_order: number;
}

export interface MenuItem {
  id: string;
  cafe_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  available: boolean;
  category?: MenuCategory;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'served' | 'paid';

export interface Order {
  id: string;
  cafe_id: string;
  table_id?: string;
  table_number?: number;
  status: OrderStatus;
  total: number;
  note?: string;
  created_at: string;
  order_items?: OrderItem[];
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}
