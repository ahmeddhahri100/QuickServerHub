import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, UtensilsCrossed, QrCode, ChefHat, CheckCircle2,
  Clock, CreditCard, Plus, Trash2, Pencil, X, Loader2, Bell,
  TrendingUp, Users, ShoppingBag, ToggleLeft, ToggleRight, ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabase";
import type { Order, MenuItem, MenuCategory, Cafe } from "../lib/types";

function cn(...c: (string | false | undefined | null)[]) { return c.filter(Boolean).join(" "); }

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "bg-amber-500/20 text-amber-300 border-amber-500/30",   dot: "bg-amber-400" },
  preparing: { label: "Preparing", color: "bg-blue-500/20 text-blue-300 border-blue-500/30",     dot: "bg-blue-400" },
  served:    { label: "Served",    color: "bg-violet-500/20 text-violet-300 border-violet-500/30", dot: "bg-violet-400" },
  paid:      { label: "Paid",      color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
};

const STATUS_FLOW: Record<string, string> = { pending: "preparing", preparing: "served", served: "paid" };

// ─── Order Card ───────────────────────────────────────────────────
function OrderCard({ order, onAdvance }: { order: Order; onAdvance: (id: string, next: string) => void }) {
  const cfg = STATUS_CONFIG[order.status];
  const next = STATUS_FLOW[order.status];
  const nextLabel = next ? STATUS_CONFIG[next as keyof typeof STATUS_CONFIG]?.label : null;
  const age = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
    >
      <div className={cn("flex items-center justify-between px-4 py-3 border-b border-white/10",
        order.status === "pending" ? "bg-amber-500/10" : "bg-white/3")}>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Table</div>
          <div className="text-xl font-display font-bold text-white">{order.table_number ?? "?"}</div>
        </div>
        <div className="text-right">
          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold", cfg.color)}>
            <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle", cfg.dot)} />
            {cfg.label}
          </span>
          <div className="text-xs text-slate-600 mt-1">{age}m ago</div>
        </div>
      </div>

      <div className="p-4 flex-1 space-y-1">
        {order.order_items?.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-slate-300">{item.quantity}× {item.item_name}</span>
            <span className="text-slate-500">{(item.unit_price * item.quantity).toFixed(2)} DT</span>
          </div>
        ))}
      </div>

      <div className="px-4 pb-3 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-orange-400 font-bold">{order.total.toFixed(2)} DT</span>
        {nextLabel && (
          <button onClick={() => onAdvance(order.id, next)}
            className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-all active:scale-95">
            → {nextLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Menu Editor Modal ────────────────────────────────────────────
function MenuModal({ item, categories, cafeId, onClose, onSaved }: {
  item: Partial<MenuItem> | null; categories: MenuCategory[]; cafeId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<MenuItem>>(item || { name: "", price: 0, available: true });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (form.id) {
      await supabase.from("menu_items").update({ name: form.name, description: form.description,
        price: form.price, category_id: form.category_id, image_url: form.image_url, available: form.available
      }).eq("id", form.id);
    } else {
      await supabase.from("menu_items").insert({ cafe_id: cafeId, name: form.name,
        description: form.description, price: form.price, category_id: form.category_id,
        image_url: form.image_url, available: form.available ?? true });
    }
    setSaving(false);
    onSaved();
  };

  const F = (k: keyof MenuItem, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.form initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onSubmit={save} className="w-full max-w-md bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-lg">{form.id ? "Edit Item" : "New Item"}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
        </div>
        {[
          { label: "Name", key: "name" as const, type: "text", required: true },
          { label: "Description", key: "description" as const, type: "text" },
          { label: "Image URL", key: "image_url" as const, type: "url" },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1 block">{f.label}</label>
            <input type={f.type} required={f.required} value={(form[f.key] as string) || ""}
              onChange={e => F(f.key, e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1 block">Price (DT)</label>
            <input type="number" step="0.01" required value={form.price || 0}
              onChange={e => F("price", parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1 block">Category</label>
            <select value={form.category_id || ""} onChange={e => F("category_id", e.target.value)}
              className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50">
              <option value="">None</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.available ?? true} onChange={e => F("available", e.target.checked)}
            className="w-4 h-4 accent-orange-500" />
          <span className="text-sm text-slate-300">Available</span>
        </label>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-sm font-semibold transition-all">Cancel</button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-xl text-sm font-bold transition-all active:scale-95">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────
type Tab = "orders" | "menu" | "qr";

export default function CafeDashboard() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tab, setTab] = useState<Tab>("orders");
  const [orderFilter, setOrderFilter] = useState<string>("pending");
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null | false>(false);
  const [tableCount, setTableCount] = useState(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCafes();
  }, []);

  useEffect(() => {
    if (!cafe) return;
    loadOrders();
    loadMenu();
    // Realtime subscription
    const channel = supabase.channel(`cafe:${cafe.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `cafe_id=eq.${cafe.id}` },
        async (payload) => {
          const { data } = await supabase.from("orders").select("*, order_items(*)").eq("id", payload.new.id).single();
          if (data) setOrders(prev => [data, ...prev]);
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `cafe_id=eq.${cafe.id}` },
        (payload) => setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } as Order : o)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cafe]);

  async function loadCafes() {
    const { data } = await supabase.from("cafes").select("*").order("name");
    if (data && data.length > 0) { setCafes(data); setCafe(data[0]); }
    setLoading(false);
  }

  async function loadOrders() {
    if (!cafe) return;
    const { data } = await supabase.from("orders").select("*, order_items(*)")
      .eq("cafe_id", cafe.id).order("created_at", { ascending: false }).limit(100);
    setOrders(data || []);
  }

  async function loadMenu() {
    if (!cafe) return;
    const { data: cats } = await supabase.from("menu_categories").select("*").eq("cafe_id", cafe.id).order("display_order");
    const { data: items } = await supabase.from("menu_items").select("*").eq("cafe_id", cafe.id).order("name");
    setCategories(cats || []);
    setMenuItems(items || []);
  }

  async function advanceOrder(id: string, next: string) {
    await supabase.from("orders").update({ status: next }).eq("id", id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: next as any } : o));
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    setMenuItems(prev => prev.filter(m => m.id !== id));
  }

  async function toggleItem(item: MenuItem) {
    await supabase.from("menu_items").update({ available: !item.available }).eq("id", item.id);
    setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, available: !item.available } : m));
  }

  const filteredOrders = orders.filter(o => o.status === orderFilter);
  const todayRevenue = orders.filter(o => o.status === "paid" && new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + o.total, 0);
  const appUrl = window.location.origin;

  const NAV: { id: Tab; icon: any; label: string }[] = [
    { id: "orders", icon: LayoutDashboard, label: "Orders" },
    { id: "menu",   icon: UtensilsCrossed, label: "Menu" },
    { id: "qr",    icon: QrCode, label: "QR Codes" },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 size={36} className="text-orange-400 animate-spin" />
    </div>
  );

  if (!cafe) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-slate-400 text-sm">
      No cafes found. Add one via the Admin panel.
      <Link to="/admin" className="ml-2 text-orange-400 underline">Go to Admin</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0d0d15] border-r border-white/[0.07] flex flex-col shrink-0">
        <div className="p-5 border-b border-white/[0.07]">
          <Link to="/" className="flex items-center gap-2 mb-4 text-slate-400 hover:text-white transition-colors text-xs">
            <ArrowLeft size={14} /> Home
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shrink-0">
              <ChefHat size={14} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-sm leading-tight">Dashboard</span>
          </div>
          {/* Cafe selector */}
          <select value={cafe.id} onChange={e => setCafe(cafes.find(c => c.id === e.target.value) || cafe)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-500/50">
            {cafes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                tab === n.id ? "bg-orange-500/15 text-orange-400 border border-orange-500/20" : "text-slate-500 hover:text-white hover:bg-white/5")}>
              <n.icon size={16} />
              {n.label}
              {n.id === "orders" && orders.filter(o => o.status === "pending").length > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {orders.filter(o => o.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Stats */}
        <div className="p-4 border-t border-white/[0.07] space-y-3">
          {[
            { icon: TrendingUp, label: "Today's Revenue", val: `${todayRevenue.toFixed(2)} DT` },
            { icon: ShoppingBag, label: "Total Orders", val: orders.length },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <s.icon size={12} className="text-slate-600" />
              <div className="flex-1">
                <div className="text-[10px] text-slate-600">{s.label}</div>
                <div className="text-xs font-bold text-white">{s.val}</div>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-600">Live updates active</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* ── ORDERS TAB ─────────────────────────────────────────── */}
        {tab === "orders" && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-white text-2xl">Orders</h2>
              <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <button key={k} onClick={() => setOrderFilter(k)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      orderFilter === k ? "bg-white/15 text-white" : "text-slate-500 hover:text-white")}>
                    {v.label}
                    <span className={cn("ml-1.5 text-[10px] px-1 rounded-full", orders.filter(o => o.status === k).length > 0 ? "bg-orange-500/30 text-orange-300" : "bg-white/10 text-slate-600")}>
                      {orders.filter(o => o.status === k).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredOrders.map(o => <OrderCard key={o.id} order={o} onAdvance={advanceOrder} />)}
                {filteredOrders.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="col-span-full py-24 text-center text-slate-600">
                    <Clock size={36} className="mx-auto mb-3 opacity-30" />
                    <p>No {orderFilter} orders right now</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── MENU TAB ───────────────────────────────────────────── */}
        {tab === "menu" && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-white text-2xl">Menu Items</h2>
              <button onClick={() => setEditItem({ available: true })}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all">
                <Plus size={16} /> Add Item
              </button>
            </div>
            <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {["Item", "Category", "Price", "Status", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {menuItems.map(item => (
                    <tr key={item.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-white/10" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                              <UtensilsCrossed size={16} className="text-orange-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white text-sm">{item.name}</div>
                            {item.description && <div className="text-xs text-slate-600 max-w-[200px] truncate">{item.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-white/10 text-slate-400 px-2 py-0.5 rounded-full">
                          {categories.find(c => c.id === item.category_id)?.name || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-orange-400 font-bold text-sm">{item.price.toFixed(2)} DT</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleItem(item)} className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
                          {item.available
                            ? <><ToggleRight size={20} className="text-emerald-400" /><span className="text-xs text-emerald-400">Available</span></>
                            : <><ToggleLeft size={20} className="text-slate-600" /><span className="text-xs text-slate-600">Hidden</span></>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setEditItem(item)} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"><Pencil size={14} /></button>
                          <button onClick={() => deleteItem(item.id)} className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {menuItems.length === 0 && (
                <div className="text-center py-16 text-slate-600">
                  <UtensilsCrossed size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No menu items yet. Add one!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── QR TAB ─────────────────────────────────────────────── */}
        {tab === "qr" && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-white text-2xl">QR Codes</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Tables:</label>
                <input type="number" min={1} max={50} value={tableCount}
                  onChange={e => setTableCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500/50 text-center" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: tableCount }, (_, i) => i + 1).map(t => {
                const url = `${appUrl}/menu/${cafe.slug}/${t}`;
                return (
                  <div key={t} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-orange-500/30 transition-colors group">
                    <div className="bg-white p-3 rounded-xl">
                      <QRCodeSVG value={url} size={100} />
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">Table</div>
                      <div className="font-display font-bold text-white text-lg">{t}</div>
                    </div>
                    <button onClick={() => window.print()}
                      className="w-full text-xs bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition-all no-print">
                      Print
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Menu Edit Modal */}
      <AnimatePresence>
        {editItem !== false && (
          <MenuModal item={editItem} categories={categories} cafeId={cafe.id}
            onClose={() => setEditItem(false)} onSaved={() => { setEditItem(false); loadMenu(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
