import React, { useState, useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route, useSearchParams, Link, useNavigate, useParams, Outlet, Navigate, useLocation } from "react-router-dom";
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
  AlertCircle,
  Search,
  BarChart3
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tableNumber = searchParams.get("table");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [tempTableInput, setTempTableInput] = useState("");

  useEffect(() => {
    dataService.getMenu().then(setMenu);
    dataService.getSettings().then(setSettings);
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
    if (!tableNumber) return;
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
        setShowCheckout(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tableNumber) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full"
        >
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <QrCode size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Welcome</h1>
          <p className="text-slate-500 mb-8 text-sm">Please scan the QR code on your table, or enter your table number below to start ordering.</p>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (tempTableInput.trim()) {
                setSearchParams({ table: tempTableInput.trim() });
              }
            }}
            className="space-y-4"
          >
            <input 
              type="text" 
              placeholder="Table Number"
              value={tempTableInput}
              onChange={(e) => setTempTableInput(e.target.value)}
              className="w-full text-center p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <Button type="submit" className="w-full py-4 text-base rounded-xl shadow-none hover:shadow-md">
              Start Ordering
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (settings && settings.service_enabled === 'false') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <AlertCircle size={48} className="text-amber-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Service Interrupted</h1>
        <p className="text-slate-500 max-w-xs transition-all">We are currently not accepting orders. Please consult our staff.</p>
      </div>
    );
  }

  if (orderSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden max-w-md w-full"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600" />
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Order Confirmed!</h1>
          <p className="text-slate-500 mb-10 text-sm leading-relaxed">
            Your selection for <span className="font-semibold text-slate-900">Table {tableNumber}</span> has been successfully sent to the kitchen.
          </p>
          <Button onClick={() => setOrderSent(false)} className="w-full py-4 text-base shadow-none hover:shadow-md transition-all">
            Return to Menu
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-40">
      {/* Modern App Header */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
                {settings?.cafe_name?.charAt(0) || "C"}
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{settings?.cafe_name || "Modern Cafe"}</h1>
                <p className="text-xs font-semibold text-slate-500">Live Menu</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest hidden sm:inline-block">Table</span>
            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full font-bold text-sm">
              {tableNumber}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 mt-10 space-y-16">
        {Array.from(new Set(menu.map(i => i.category))).map(category => (
          <section key={category} className="relative">
            <div className="mb-8 flex items-center gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{category}</h2>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menu.filter(i => i.category === category).map(item => (
                <motion.div 
                  layout
                  key={item.id} 
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex gap-4"
                >
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="text-lg font-semibold leading-tight text-slate-900">{item.name}</h3>
                        <span className="font-bold text-indigo-600 shrink-0">${item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center mt-auto">
                      {cart.find(i => i.id === item.id) ? (
                        <div className="flex items-center justify-between w-full max-w-[120px] bg-slate-100 p-1 rounded-full font-bold">
                          <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:text-slate-900 transition-colors">-</button>
                          <span className="text-sm px-2 text-slate-700">{cart.find(i => i.id === item.id)?.quantity}</span>
                          <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">+</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(item)}
                          className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full transition-all flex items-center gap-2 active:scale-95"
                        >
                          <Plus size={14} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {item.image_url && (
                    <div className="shrink-0">
                      <motion.img 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-28 h-28 object-cover rounded-xl shadow-sm bg-slate-100" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Floating Action Cart */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-6 z-40 pointer-events-none"
          >
            <div className="max-w-2xl mx-auto bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between pointer-events-auto border border-slate-700">
              <div className="px-4">
                <p className="text-xs font-medium text-slate-400 mb-0.5">Total due</p>
                <p className="text-2xl font-bold tracking-tight">${total.toFixed(2)}</p>
              </div>
              
              <button 
                onClick={() => setShowCheckout(true)}
                className="bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-3 rounded-xl font-semibold transition-all active:scale-95 flex items-center gap-2"
              >
                Checkout <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white p-8 max-w-sm w-full rounded-3xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-bold tracking-tight">Payment</h3>
                 <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">${total.toFixed(2)}</div>
              </div>
              <div className="space-y-3 mb-8">
                <button 
                  onClick={submitOrder}
                  disabled={isSubmitting}
                  className="w-full p-4 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-all font-semibold text-slate-700 group disabled:opacity-50"
                >
                  <span className="flex items-center gap-3"><ShoppingBag size={18} className="text-slate-400" /> Pay with Cash</span>
                  <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={submitOrder}
                  disabled={isSubmitting}
                  className="w-full p-4 bg-slate-900 border border-slate-900 rounded-xl text-white flex items-center justify-between hover:bg-slate-800 transition-all font-semibold group disabled:opacity-50"
                >
                  <span className="flex items-center gap-3"><QrCode size={18} className="text-slate-400" /> Credit Card</span>
                  <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <button 
                onClick={() => setShowCheckout(false)}
                className="w-full text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors py-2"
              >
                Cancel Process
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KitchenPage() {
  const { cafeId } = useParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'pending' | 'ready' | 'completed'>('pending');
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    dataService.getOrders().then(setOrders);
    dataService.getSettings().then(setSettings);

    const s = getSocket();
    if (cafeId) s.emit("join:cafe", cafeId);
    
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
  }, [cafeId]);

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
  const { cafeId } = useParams();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [tableCount, setTableCount] = useState(10);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'menu' | 'analytics' | 'settings'>('menu');

  const filteredMenu = useMemo(() => {
    return menu.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [menu, searchTerm]);

  useEffect(() => {
    dataService.getAdminMenu().then(setMenu);
    dataService.getStats().then(setStats);
    dataService.getSettings().then(setSettings);
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

  const toggleService = async () => {
    const newVal = settings.service_enabled === 'true' ? 'false' : 'true';
    await dataService.updateSettings('service_enabled', newVal);
    setSettings({ ...settings, service_enabled: newVal });
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
               <button 
                 onClick={() => setActiveTab('menu')}
                 className={cn(
                   "w-full flex items-center gap-3 font-bold py-2 px-3 rounded-lg text-sm transition-all text-left",
                   activeTab === 'menu' ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
                 )}
               >
                 <ShoppingBag size={18} /> Menu Editor
               </button>
               <button 
                 onClick={() => setActiveTab('analytics')}
                 className={cn(
                   "w-full flex items-center gap-3 font-bold py-2 px-3 rounded-lg text-sm transition-all text-left",
                   activeTab === 'analytics' ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
                 )}
               >
                 <BarChart3 size={18} /> Analytics
               </button>
               <button 
                 onClick={() => setActiveTab('settings')}
                 className={cn(
                   "w-full flex items-center gap-3 font-bold py-2 px-3 rounded-lg text-sm transition-all text-left",
                   activeTab === 'settings' ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
                 )}
               >
                 <Settings size={18} /> System Settings
               </button>
            </div>
          </div>

          <div>
             <h3 className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-4 px-1">Infrastructure</h3>
             <div className="p-3 bg-slate-50 rounded-xl space-y-3">
               <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 mb-1 block">Table Capacity</label>
                  <input 
                    type="number" 
                    value={tableCount} 
                    onChange={e => setTableCount(parseInt(e.target.value))}
                    className="w-full p-2 bg-white rounded border border-slate-200 text-sm font-bold"
                  />
               </div>
               <Button 
                onClick={toggleService}
                className={cn(
                  "w-full py-2 text-[10px] font-black uppercase tracking-wider h-auto border-none",
                  settings?.service_enabled === 'true' ? "bg-emerald-600" : "bg-red-600"
                )}
               >
                 {settings?.service_enabled === 'true' ? "Service Online" : "Service Offline"}
               </Button>
             </div>
          </div>
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {activeTab === 'menu' && (
            <section>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Catalog Items</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-slate-400">{menu.length} total dishes found.</p>
                    {searchTerm && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                        {filteredMenu.length} results
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search dishes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-all"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search size={16} />
                    </div>
                  </div>
                  <Button onClick={() => { setEditingItem({ name: '', price: 0, category: 'Main', available: 1 }); setShowAdd(true); }} className="py-2.5 w-full sm:w-auto">
                    <Plus size={18} /> Add New Dish
                  </Button>
                </div>
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
                    {filteredMenu.map(item => (
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
          )}

          {activeTab === 'analytics' && stats && (
            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-48">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Gross Revenue</span>
                    <h4 className="text-4xl font-black text-slate-900 tracking-tight">${stats.totalSales.toFixed(2)}</h4>
                    <div className="flex items-center gap-1 text-emerald-500 font-bold text-xs">
                       <Plus size={12} /> Live Sync
                    </div>
                 </div>
                 <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-48 text-indigo-600">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lifetime Orders</span>
                    <h4 className="text-4xl font-black text-slate-900 tracking-tight">{stats.orderCount}</h4>
                    <span className="text-xs text-slate-400 font-medium">All status types</span>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-900 mb-6">Daily Performance</h3>
                 <div className="flex items-end gap-2 h-40">
                    {stats.dailySales.map((day: any, i: number) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                        <div 
                          className="w-full bg-indigo-100 rounded-t-lg group-hover:bg-indigo-600 transition-all cursor-pointer" 
                          style={{ height: `${(day.total / 100) * 100}%` }}
                        />
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{day.date.split('-').slice(1).join('/')}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </section>
          )}

          {activeTab === 'settings' && (
            <section className="max-w-2xl animate-in fade-in">
               <h2 className="text-2xl font-black text-slate-900 mb-8">Cafe Environment</h2>
               <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Cafe Name</label>
                    <div className="flex gap-4">
                      <input 
                        type="text"
                        value={settings?.cafe_name}
                        onChange={(e) => setSettings({ ...settings, cafe_name: e.target.value })}
                        className="flex-1 p-3 rounded-xl border border-slate-200 font-medium text-slate-900"
                      />
                      <Button onClick={() => dataService.updateSettings('cafe_name', settings.cafe_name)}>Update</Button>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2">Service Status</h4>
                    <p className="text-xs text-slate-500 mb-6">Instantly disable all customer ordering. Users will see a maintenance message.</p>
                    <button 
                      onClick={toggleService}
                      className={cn(
                        "flex items-center gap-3 px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                        settings?.service_enabled === 'true' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                      )}
                    >
                      {settings?.service_enabled === 'true' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      {settings?.service_enabled === 'true' ? "Live & Accepting Orders" : "Offline / Maintenance"}
                    </button>
                  </div>
               </div>
            </section>
          )}

          {/* QR Generator Section - Always visible bottom */}
          {activeTab === 'menu' && (
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <QrCode className="text-indigo-600" />
                QR Entry Points
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {Array.from({ length: tableCount }).map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-center gap-4 group hover:border-indigo-200 hover:shadow-md transition-all">
                      <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                        <QRCodeSVG value={`${appUrl}/${cafeId}/menu?table=${i + 1}`} size={120} />
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
          )}
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
function Navbar({ cafeId }: { cafeId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Hide navbar on menu page for customers
  if (location.pathname.includes('/menu')) return null;

  return (
    <div className="fixed top-0 right-0 p-4 z-50 flex gap-2 no-print">
       <Button variant="ghost" onClick={() => navigate(`/${cafeId}/kitchen`)} className="bg-white/80 backdrop-blur shadow-sm">
         <ChefHat size={18} /> Kitchen
       </Button>
       <Button variant="ghost" onClick={() => navigate(`/${cafeId}/admin`)} className="bg-white/80 backdrop-blur shadow-sm">
         <Settings size={18} /> Admin
       </Button>
    </div>
  );
}

function CafeLayout() {
  const { cafeId } = useParams();
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (cafeId) {
      dataService.setCafeId(cafeId);
      dataService.getCafe(cafeId)
        .then(() => setValid(true))
        .catch(() => setValid(false));
    }
  }, [cafeId]);

  if (valid === null) return null;
  if (!valid) return <div className="p-10 text-center font-bold text-slate-500 font-sans">Cafe not found.</div>;

  return (
    <>
      <Navbar cafeId={cafeId!} />
      <Outlet />
    </>
  );
}

function Home() {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const createCafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const id = slug + '-' + Math.floor(Math.random() * 1000);
    
    try {
      await dataService.createCafe({ id, name });
      navigate(`/${id}/admin`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full"
      >
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ChefHat size={32} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Platform Setup</h1>
        <p className="text-slate-500 mb-8 text-sm">Create an account for your coffee shop to get started.</p>
        
        <form onSubmit={createCafe} className="space-y-4">
          <input 
            type="text" 
            placeholder="Coffee Shop Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-center p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="w-full py-4 text-base rounded-xl">
            {loading ? "Creating..." : "Create Shop"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:cafeId" element={<CafeLayout />}>
          <Route index element={<Navigate to="menu" replace />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="kitchen" element={<KitchenPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

