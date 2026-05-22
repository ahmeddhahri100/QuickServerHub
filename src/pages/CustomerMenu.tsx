import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingCart, Plus, Minus, X, CheckCircle2, ChevronRight,
  Loader2, QrCode, CreditCard, ArrowLeft
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { MenuItem, MenuCategory, CartItem, Cafe } from "../lib/types";

// ─── Helpers ──────────────────────────────────────────────────────
function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Component: Category Pill ─────────────────────────────────────
function CategoryPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all",
        active
          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
          : "bg-white/10 text-slate-300 hover:bg-white/20"
      )}
    >
      {children}
    </button>
  );
}

// ─── Component: Menu Item Card ────────────────────────────────────
function MenuItemCard({ item, cartQty, onAdd, onRemove }: {
  item: MenuItem;
  cartQty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-orange-500/30",
        !item.available && "opacity-40 pointer-events-none"
      )}
    >
      {item.image_url ? (
        <div className="relative h-44 overflow-hidden">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {!item.available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-sm font-bold text-white/70 uppercase tracking-widest">Sold Out</span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-2 bg-gradient-to-r from-orange-500/40 to-pink-500/40" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-semibold text-white text-base leading-tight">{item.name}</h3>
          <span className="text-orange-400 font-bold text-base whitespace-nowrap">{item.price.toFixed(2)} DT</span>
        </div>
        {item.description && (
          <p className="text-xs text-slate-400 leading-relaxed mb-4">{item.description}</p>
        )}
        <div className="flex justify-end">
          {cartQty === 0 ? (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all active:scale-95"
            >
              <Plus size={14} /> Add
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-white/10 rounded-full px-2 py-1">
              <button onClick={onRemove} className="text-slate-300 hover:text-white p-1 transition-colors">
                <Minus size={14} />
              </button>
              <span className="text-white font-bold text-sm w-4 text-center">{cartQty}</span>
              <button onClick={onAdd} className="text-orange-400 hover:text-orange-300 p-1 transition-colors">
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Component: Cart Drawer ───────────────────────────────────────
function CartDrawer({
  cart, total, onClose, onAdd, onRemove, onSubmit, isSubmitting
}: {
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-full max-w-sm bg-[#111118] border-l border-white/10 z-50 flex flex-col shadow-2xl"
    >
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-orange-400" />
          <h2 className="font-display font-bold text-white text-lg">Your Order</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {cart.map(item => (
          <div key={item.id} className="flex items-center gap-4 bg-white/5 rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm truncate">{item.name}</div>
              <div className="text-orange-400 text-xs font-semibold">{(item.price * item.quantity).toFixed(2)} DT</div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-2 py-1 shrink-0">
              <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-white p-0.5 transition-colors">
                <Minus size={12} />
              </button>
              <span className="text-white font-bold text-xs w-4 text-center">{item.quantity}</span>
              <button onClick={() => onAdd(item.id)} className="text-orange-400 hover:text-orange-300 p-0.5 transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 border-t border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Total</span>
          <span className="text-white font-display font-bold text-2xl">{total.toFixed(2)} DT</span>
        </div>
        <button
          onClick={onSubmit}
          disabled={isSubmitting || cart.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 disabled:opacity-50 disabled:pointer-events-none text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-orange-500/20"
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
          {isSubmitting ? "Sending order..." : "Confirm & Order"}
        </button>
        <p className="text-center text-xs text-slate-600">Your order goes directly to the kitchen</p>
      </div>
    </motion.div>
  );
}

// ─── Page: Order Confirmed ─────────────────────────────────────────
function OrderConfirmed({ tableNumber, onBack }: { tableNumber: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 260 }}
        className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", damping: 18, stiffness: 300 }}
          className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 size={38} className="text-emerald-400" />
        </motion.div>
        <h2 className="font-display font-bold text-white text-2xl mb-2">Order Sent!</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-2">
          Table <span className="text-white font-bold">{tableNumber}</span> — your order has been sent to the kitchen.
        </p>
        <p className="text-slate-600 text-xs mb-8">We'll let you know when it's ready 🔔</p>
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all active:scale-95"
        >
          <ArrowLeft size={16} />
          Back to Menu
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main Page: CustomerMenu ───────────────────────────────────────
export default function CustomerMenu() {
  const { cafeSlug, tableNumber } = useParams<{ cafeSlug: string; tableNumber: string }>();
  const [searchParams] = useSearchParams();

  const resolvedCafeSlug = cafeSlug || searchParams.get("cafe") || "cafe-atlas";
  const resolvedTable = tableNumber || searchParams.get("table") || "1";

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMenu();
  }, [resolvedCafeSlug]);

  async function loadMenu() {
    setLoading(true);
    setError(null);
    try {
      // Load cafe info
      const { data: cafeData, error: cafeErr } = await supabase
        .from("cafes")
        .select("*")
        .eq("slug", resolvedCafeSlug)
        .single();

      if (cafeErr) throw new Error("Cafe not found");
      if (cafeData.status === "inactive") throw new Error("This cafe is currently closed");

      setCafe(cafeData);

      // Load categories & items
      const { data: cats } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("cafe_id", cafeData.id)
        .order("display_order");

      const { data: items } = await supabase
        .from("menu_items")
        .select("*, category:menu_categories(id,name)")
        .eq("cafe_id", cafeData.id)
        .eq("available", true)
        .order("name");

      setCategories(cats || []);
      setMenuItems(items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, image_url: item.image_url }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      if (!existing) return prev;
      if (existing.quantity > 1) return prev.map(c => c.id === id ? { ...c, quantity: c.quantity - 1 } : c);
      return prev.filter(c => c.id !== id);
    });
  }, []);

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const filteredItems = activeCategory === "all"
    ? menuItems
    : menuItems.filter(i => i.category_id === activeCategory);

  async function submitOrder() {
    if (!cafe || cart.length === 0) return;
    setIsSubmitting(true);
    try {
      // Get table id
      const { data: tableData } = await supabase
        .from("cafe_tables")
        .select("id")
        .eq("cafe_id", cafe.id)
        .eq("table_number", parseInt(resolvedTable))
        .single();

      // Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          cafe_id: cafe.id,
          table_id: tableData?.id || null,
          table_number: parseInt(resolvedTable),
          status: "pending",
          total: cartTotal,
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Insert order items
      const orderItems = cart.map(c => ({
        order_id: order.id,
        menu_item_id: c.id,
        item_name: c.name,
        quantity: c.quantity,
        unit_price: c.price,
      }));

      await supabase.from("order_items").insert(orderItems);

      setCart([]);
      setCartOpen(false);
      setOrderSent(true);
    } catch (e) {
      alert("Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading menu...</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <QrCode size={28} className="text-red-400" />
          </div>
          <h2 className="font-display font-bold text-white text-xl mb-2">Oops!</h2>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Order sent ─────────────────────────────────────────────────
  if (orderSent) {
    return <OrderConfirmed tableNumber={resolvedTable} onBack={() => setOrderSent(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-32">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-orange-500/5 to-transparent" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-display font-bold text-white text-xl leading-tight">{cafe?.name}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-500">Table {resolvedTable}</span>
              </div>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all active:scale-95"
            >
              <ShoppingCart size={16} />
              Cart
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <CategoryPill active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>
              All
            </CategoryPill>
            {categories.map(cat => (
              <CategoryPill
                key={cat.id}
                active={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </CategoryPill>
            ))}
          </div>
        </div>
      </header>

      {/* Menu grid */}
      <main className="max-w-2xl mx-auto px-5 pt-6">
        {categories
          .filter(cat => activeCategory === "all" || cat.id === activeCategory)
          .map(cat => {
            const items = filteredItems.filter(i => i.category_id === cat.id);
            if (items.length === 0) return null;
            return (
              <section key={cat.id} className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-display font-bold text-white text-lg">{cat.name}</h2>
                  <div className="flex-1 h-px bg-white/5" />
                  <ChevronRight size={16} className="text-slate-600" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.map(item => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      cartQty={cart.find(c => c.id === item.id)?.quantity || 0}
                      onAdd={() => addToCart(item)}
                      onRemove={() => removeFromCart(item.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

        {filteredItems.length === 0 && (
          <div className="text-center py-20 text-slate-600">
            <p className="text-lg font-semibold">No items available</p>
          </div>
        )}
      </main>

      {/* Floating cart button */}
      <AnimatePresence>
        {cartCount > 0 && !cartOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-30 max-w-2xl mx-auto"
          >
            <button
              onClick={() => setCartOpen(true)}
              className="w-full flex items-center justify-between bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold px-6 py-4 rounded-2xl shadow-2xl shadow-orange-500/30 active:scale-95 transition-all"
            >
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm">{cartCount} items</span>
              <span className="text-base">View Order</span>
              <span className="text-base">{cartTotal.toFixed(2)} DT</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart drawer overlay */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => setCartOpen(false)}
            />
            <CartDrawer
              cart={cart}
              total={cartTotal}
              onClose={() => setCartOpen(false)}
              onAdd={id => {
                const item = menuItems.find(m => m.id === id);
                if (item) addToCart(item);
              }}
              onRemove={removeFromCart}
              onSubmit={submitOrder}
              isSubmitting={isSubmitting}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
