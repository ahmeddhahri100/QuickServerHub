import React, { useState, useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route, useSearchParams, Link, useNavigate } from "react-router-dom";
import { 
  ShoppingBag, 
  ChefHat, 
  Settings, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  QrCode,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { dataService } from "./services/dataService";

// --- Types ---
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  available: number;
}

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  table_number: string;
  status: 'pending' | 'ready' | 'completed';
  total_price: number;
  created_at: string;
  items: OrderItem[];
}

interface CartItem extends MenuItem {
  quantity: number;
}

// --- Socket Service ---
let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    socket = io();
  }
  return socket;
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-sm shadow-indigo-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 active:scale-95",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 active:scale-95",
  };
  
  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Views ---

function MenuPage() {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get("table") || "Express";
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSent, setOrderSent] = useState(false);

  useEffect(() => {
    dataService.getMenu().then(setMenu);
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const submitOrder = async () => {
    setIsSubmitting(true);
    try {
      const res = await dataService.createOrder({
        table_number: tableNumber,
        items: cart,
        total_price: total
      });
      if (res.success) {
        setCart([]);
        setOrderSent(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSent) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 text-center font-serif">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-lg shadow-2xl border border-slate-200 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-100">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight italic">Merci Beaucoup!</h1>
          <p className="text-slate-600 mb-10 max-w-xs mx-auto font-sans text-sm leading-relaxed">
            Your selection for <span className="font-bold text-slate-900">Table {tableNumber}</span> has been noted by our artisans.
          </p>
          <Button onClick={() => setOrderSent(false)} className="w-full py-4 rounded-none border-2 border-slate-900 bg-slate-900 text-white font-serif italic text-lg hover:bg-slate-800">
            Return to Library
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 font-serif pb-40">
      {/* Editorial Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col items-center">
          <div className="w-12 h-1 bg-indigo-600 mb-4" />
          <p className="text-[10px] font-sans font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Since 1994 • Gastronomique</p>
          <h1 className="text-4xl font-bold tracking-tighter italic">La Carte du Jour</h1>
          <div className="mt-4 px-4 py-1.5 border border-slate-900 rounded-full font-sans font-bold text-[10px] uppercase tracking-widest bg-white">
            Station No. {tableNumber}
          </div>
        </div>
      </header>

      {/* Book-style Content */}
      <main className="max-w-3xl mx-auto px-6 mt-12 space-y-20">
        {Array.from(new Set(menu.map(i => i.category))).map(category => (
          <section key={category} className="relative">
            <div className="text-center mb-12">
              <h2 className="text-sm font-sans font-black uppercase tracking-[0.4em] text-slate-300 mb-2">{category}</h2>
              <div className="w-8 h-px bg-slate-200 mx-auto" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-x-12 gap-y-16">
              {menu.filter(i => i.category === category).map(item => (
                <motion.div 
                  layout
                  key={item.id} 
                  className="group"
                >
                  <div className="flex justify-between items-baseline gap-4 mb-2">
                    <h3 className="text-xl font-bold leading-tight group-hover:text-indigo-600 transition-colors">{item.name}</h3>
                    <div className="flex-1 border-b border-dotted border-slate-300 min-w-[20px]" />
                    <span className="text-lg font-bold italic">${item.price.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex gap-6 items-start">
                    <div className="flex-1">
                      <p className="text-slate-500 font-sans text-sm leading-relaxed mb-4 italic">
                        {item.description}
                      </p>
                      
                      <div className="flex items-center gap-3">
                        {cart.find(i => i.id === item.id) ? (
                          <div className="flex items-center gap-4 bg-slate-100 px-3 py-1.5 rounded-full font-sans text-xs font-bold">
                            <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-slate-900 transition-colors">-</button>
                            <span>{cart.find(i => i.id === item.id)?.quantity}</span>
                            <button onClick={() => addToCart(item)} className="text-indigo-600">+</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(item)}
                            className="font-sans text-[10px] font-black uppercase tracking-widest border border-slate-200 px-4 py-2 rounded-full hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center gap-2"
                          >
                            <Plus size={12} /> Add to Folio
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {item.image_url && (
                      <motion.img 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-24 h-24 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Cart Summary - Magazine Style */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-8 z-40"
          >
            <div className="max-w-xl mx-auto bg-slate-900 text-white p-6 shadow-2xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 text-[8px] font-sans font-black uppercase tracking-[0.3em]">
                Review Selection
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] font-sans uppercase font-bold text-slate-500 mb-1">Aggregate</p>
                  <p className="text-3xl font-bold font-serif italic">${total.toFixed(2)}</p>
                </div>
                
                <button 
                  onClick={submitOrder}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 font-serif italic font-bold text-lg disabled:opacity-50 transition-all active:scale-95"
                >
                  {isSubmitting ? "Sending..." : "Affirm Selection"}
                </button>
              </div>
              <p className="text-[10px] font-sans text-slate-500 text-center uppercase tracking-widest mt-4">Immediate Kitchen Notification Secured</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1] overflow-hidden">
        <div className="absolute top-10 left-10 text-[20vw] font-black">MENŪ</div>
        <div className="absolute bottom-10 right-10 text-[20vw] font-black rotate-180">MENŪ</div>
      </div>
    </div>
  );
}

function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'pending' | 'ready' | 'completed'>('pending');

  useEffect(() => {
    dataService.getOrders().then(setOrders);

    const s = getSocket();
    s.on("order:new", (order) => {
      setOrders(prev => [order, ...prev]);
    });
    s.on("order:update", ({ id, status }) => {
      setOrders(prev => prev.map(o => o.id === parseInt(id) ? { ...o, status } : o));
    });

    return () => {
      s.off("order:new");
      s.off("order:update");
    };
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await dataService.updateOrderStatus(id, status);
  };

  const filteredOrders = orders.filter(o => o.status === filter);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">Q</div>
          <h1 className="font-bold text-xl tracking-tight">QuickServe</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {(['pending', 'ready', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg flex items-center justify-between transition-all font-medium",
                filter === tab ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <span className="capitalize">{tab} View</span>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                filter === tab ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"
              )}>
                {orders.filter(o => o.status === tab).length}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
           <div className="flex items-center gap-2 px-2">
             <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Sync Active</span>
           </div>
           <Link to="/admin" className="mt-4 flex items-center gap-2 px-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
              <Settings size={14} /> Menu Editor
           </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="font-bold text-slate-900">Kitchen Display System</h2>
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {filteredOrders.length} {filter} Orders
            </div>
            {filter === 'pending' && filteredOrders.length > 0 && (
              <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Priority: {filteredOrders.length}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map(order => (
                <motion.div 
                  layout
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden"
                >
                  <div className={cn(
                    "p-4 border-b flex justify-between items-center",
                    order.status === 'pending' ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="flex flex-col">
                      <span className={cn("text-[10px] font-black uppercase tracking-tight", order.status === 'pending' ? "text-amber-800" : "text-slate-400")}>Table</span>
                      <span className={cn("text-xl font-black", order.status === 'pending' ? "text-amber-900" : "text-slate-900")}>{order.table_number}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                         {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 space-y-4">
                    <ul className="space-y-3">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-800">{item.quantity}x {item.name}</span>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Item</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto">
                    {order.status === 'pending' ? (
                      <button 
                        onClick={() => updateStatus(order.id, 'ready')}
                        className="w-full py-4 bg-emerald-600 text-white font-bold hover:bg-emerald-700 uppercase tracking-widest text-xs transition-colors border-none"
                      >
                        Mark as Ready
                      </button>
                    ) : order.status === 'ready' ? (
                      <button 
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="w-full py-4 bg-indigo-600 text-white font-bold hover:bg-indigo-700 uppercase tracking-widest text-xs transition-colors border-none"
                      >
                        Mark as Served
                      </button>
                    ) : (
                      <div className="w-full py-4 bg-slate-100 text-slate-400 text-center font-bold uppercase tracking-widest text-[10px]">Order Completed</div>
                    )}
                  </div>
                </motion.div>
              ))}
              {filteredOrders.length === 0 && (
                <div className="col-span-full py-20 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                   <Clock className="mb-3 opacity-20" size={48} />
                   <p className="font-medium">Waiting for new orders...</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}


function AdminPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [tableCount, setTableCount] = useState(10);

  useEffect(() => {
    dataService.getAdminMenu().then(setMenu);
  }, []);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    await dataService.saveMenuItem(editingItem);
    dataService.getAdminMenu().then(setMenu);
    setEditingItem(null);
    setShowAdd(false);
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    await dataService.deleteMenuItem(id);
    setMenu(menu.filter(m => m.id !== id));
  };

  const toggleAvailability = async (item: MenuItem) => {
    const updated = { ...item, available: item.available ? 0 : 1 };
    await dataService.saveMenuItem(updated);
    setMenu(menu.map(m => m.id === item.id ? (updated as MenuItem) : m));
  };

  const appUrl = ((import.meta as any).env.VITE_APP_URL || window.location.origin).replace(/\/$/, "");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white p-6 flex flex-col shrink-0">
        <Link to="/" className="flex items-center gap-3 mb-10">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">Q</div>
          <h2 className="font-bold text-xl text-slate-900 tracking-tight">QR Admin</h2>
        </Link>
        
        <nav className="space-y-6 flex-1">
          <div>
            <h3 className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-4 px-1">Management</h3>
            <div className="space-y-1">
               <Button variant="ghost" className="w-full justify-start font-bold py-2 px-3 text-slate-800">
                 <ShoppingBag size={18} /> Menu Editor
               </Button>
               <Button variant="ghost" className="w-full justify-start text-slate-500 py-2 px-3">
                 <QrCode size={18} /> Table Layout
               </Button>
            </div>
          </div>

          <div>
             <h3 className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-4">Table Capacity</h3>
             <input 
               type="number" 
               value={tableCount} 
               onChange={e => setTableCount(parseInt(e.target.value))}
               className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
             />
          </div>
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Menu Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Catalog Items</h2>
                <p className="text-sm text-slate-400">{menu.length} total dishes found.</p>
              </div>
              <Button onClick={() => { setEditingItem({ name: '', price: 0, category: 'Main', available: 1 }); setShowAdd(true); }} className="py-2.5">
                <Plus size={18} /> Add New Dish
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 text-[10px] text-slate-400 uppercase font-black">Item</th>
                    <th className="text-left p-4 text-[10px] text-slate-400 uppercase font-black">Category</th>
                    <th className="text-left p-4 text-[10px] text-slate-400 uppercase font-black">Price</th>
                    <th className="text-left p-4 text-[10px] text-slate-400 uppercase font-black">Status</th>
                    <th className="text-right p-4 text-[10px] text-slate-400 uppercase font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {menu.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                             <img src={item.image_url} className="w-12 h-12 rounded-lg object-cover bg-slate-100" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-400">
                               <ShoppingBag size={20} />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-400 max-w-[200px] truncate">{item.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-700">${item.price.toFixed(2)}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => toggleAvailability(item)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            item.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}
                        >
                          {item.available ? "In Stock" : "Sold Out"}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" className="p-2" onClick={() => { setEditingItem(item); setShowAdd(true); }}>
                            <Settings size={16} />
                          </Button>
                          <Button variant="danger" className="p-2" onClick={() => deleteItem(item.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* QR Generator Section */}
          <section>
             <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
               <QrCode className="text-indigo-600" />
               QR Entry Points
             </h2>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {Array.from({ length: tableCount }).map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-center gap-4 group hover:border-indigo-200 hover:shadow-md transition-all">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                      <QRCodeSVG value={`${appUrl}/menu?table=${i + 1}`} size={120} />
                    </div>
                    <div className="text-center">
                       <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Station</span>
                       <div className="text-xl font-black text-slate-900 leading-tight">{i + 1}</div>
                    </div>
                    <Button variant="secondary" className="text-[10px] h-8 w-full font-bold bg-white" onClick={() => window.print()}>
                      Get Tag
                    </Button>
                  </div>
                ))}
             </div>
          </section>
        </div>
      </main>

      {/* Edit Modal */}
      {showAdd && editingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.form 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={saveItem}
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg space-y-6 border border-slate-200"
          >
            <h3 className="text-xl font-bold text-slate-900">{editingItem.id ? 'Modify Dish' : 'Add to Menu'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Item Name</label>
                <input 
                  required
                  value={editingItem.name} 
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Price Unit ($)</label>
                  <input 
                    type="number" step="0.01" required
                    value={editingItem.price} 
                    onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Category Tag</label>
                  <select 
                    value={editingItem.category} 
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                  >
                    <option>Starter</option>
                    <option>Main</option>
                    <option>Drinks</option>
                    <option>Dessert</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Dish Details</label>
                <textarea 
                  value={editingItem.description} 
                  onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium h-24"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Asset Link (Optional)</label>
                <input 
                  value={editingItem.image_url || ''} 
                  onChange={e => setEditingItem({ ...editingItem, image_url: e.target.value })}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
               <Button type="button" variant="secondary" className="flex-1 py-3" onClick={() => setShowAdd(false)}>Cancel</Button>
               <Button type="submit" className="flex-1 py-3">Confirm Entry</Button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}

// --- Navigation ---
function Navbar() {
  const navigate = useNavigate();
  return (
    <div className="fixed top-0 right-0 p-4 z-50 flex gap-2 no-print">
       <Button variant="ghost" onClick={() => navigate("/kitchen")} className="bg-white/80 backdrop-blur shadow-sm">
         <ChefHat size={18} /> Kitchen
       </Button>
       <Button variant="ghost" onClick={() => navigate("/admin")} className="bg-white/80 backdrop-blur shadow-sm">
         <Settings size={18} /> Admin
       </Button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

