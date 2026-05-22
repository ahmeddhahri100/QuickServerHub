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
  const tableNumber = searchParams.get("table") || "5"; // Auto-fallback to Station 5 so customer is never blocked
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  
  // Custom book model animation and sizing states
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 992);

  useEffect(() => {
    dataService.getMenu().then(setMenu);
    dataService.getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 992);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
        setCurrentPage(0); // Go back to cover once ordered
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = useMemo(() => {
    return Array.from(new Set(menu.map(i => i.category)));
  }, [menu]);

  // Construct dynamic list of pages for the double page book presentation
  const pages = useMemo(() => {
    const list: any[] = [];
    
    // 0. Closed Cover Page
    list.push({
      id: "cover",
      type: "cover",
      title: settings?.cafe_name || "Bella Vista Cafe"
    });

    // 1. Table of Contents Left
    list.push({
      id: "toc",
      type: "toc",
      title: "Index of Offerings"
    });

    // 2. Chef Welcome Right
    list.push({
      id: "welcome",
      type: "welcome",
      title: "A Warm Greeting"
    });

    // 3. Category spreads (Left = Items list, Right = Visual collage)
    categories.forEach(categoryName => {
      const categoryItems = menu.filter(item => item.category === categoryName);
      
      list.push({
        id: `page-items-${categoryName}`,
        type: "items",
        title: categoryName,
        category: categoryName,
        items: categoryItems
      });

      list.push({
        id: `page-visual-${categoryName}`,
        type: "visual",
        title: `${categoryName} Collage`,
        category: categoryName,
        items: categoryItems
      });
    });

    // Checkout Summary / Invoice Page
    list.push({
      id: "recap",
      type: "recap",
      title: "Table Draft Receipt"
    });

    // Closing Back Cover
    list.push({
      id: "back-cover",
      type: "back-cover",
      title: "Grazie Mille"
    });

    return list;
  }, [menu, categories, settings]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || newPage >= pages.length) return;
    setDirection(newPage > currentPage ? 1 : -1);
    setCurrentPage(newPage);
  };

  const pageVariants = {
    initial: (dir: number) => ({
      rotateY: dir > 0 ? 95 : -95,
      opacity: 0.7,
      scale: 0.98,
      z: -10,
    }),
    animate: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
      z: 0,
      transition: {
        duration: 0.7,
        ease: [0.25, 1, 0.5, 1] // refined authentic paper spring ease
      }
    },
    exit: (dir: number) => ({
      rotateY: dir > 0 ? -95 : 95,
      opacity: 0.7,
      scale: 0.98,
      z: -10,
      transition: {
        duration: 0.6,
        ease: [0.25, 1, 0.5, 1]
      }
    })
  };

  const renderPage = (page: any, position: 'left' | 'right' | 'single') => {
    const isLeft = position === 'left';
    const isRight = position === 'right';
    
    // Page style incorporating elegant book bindings, gold lines, paper grain textures
    const pageClass = cn(
      "w-full h-full min-h-[580px] md:min-h-[640px] flex flex-col justify-between p-6 md:p-8 text-stone-800 bg-gradient-to-tr from-[#FCFAF4] to-[#FFFDF9] border border-stone-200 shadow-md relative overflow-hidden transition-all duration-300",
      isLeft && "rounded-l-2xl border-r-0 shadow-[inset_-15px_0_30px_rgba(0,0,0,0.06),_3px_5px_0px_#E6DFCC,6px_10px_0px_#D1C9B3]",
      isRight && "rounded-r-2xl border-l-0 shadow-[inset_15px_0_30px_rgba(0,0,0,0.06),_-3px_5px_0px_#E6DFCC,-6px_10px_0px_#D1C9B3]",
      position === 'single' && "rounded-2xl shadow-2xl border border-stone-300 bg-gradient-to-tr from-[#FAF7EE] to-[#FFFDF5]"
    );

    // Front Cover View
    if (page.type === 'cover') {
      return (
        <div className={cn("w-full h-full min-h-[580px] md:min-h-[640px] flex flex-col justify-between p-10 text-center bg-gradient-to-br from-[#2E1C14] to-[#160B08] rounded-2xl relative overflow-hidden text-amber-50 shadow-2xl border-2 border-amber-900/60", isDesktop && "col-span-2 max-w-xl mx-auto")}>
          <div className="absolute inset-4 border border-amber-500/20 rounded-xl pointer-events-none" />
          <div className="absolute inset-6 border-2 border-double border-amber-500/10 rounded-lg pointer-events-none" />
          
          {/* Subtle gold crest corners */}
          <div className="absolute top-8 left-8 text-amber-500/40 text-xs font-serif">✻</div>
          <div className="absolute top-8 right-8 text-amber-500/40 text-xs font-serif">✻</div>
          <div className="absolute bottom-8 left-8 text-amber-500/40 text-xs font-serif">✻</div>
          <div className="absolute bottom-8 right-8 text-amber-500/40 text-xs font-serif">✻</div>

          <div className="mt-8 relative z-10">
            <p className="text-amber-500/80 font-serif tracking-[0.3em] uppercase text-[10px] mb-3 font-semibold">Bella Vista Dining Room</p>
            <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-amber-600/40 to-transparent mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-display font-medium tracking-wide text-amber-400 font-bold leading-tight">
              {settings?.cafe_name || "Bella Vista"}
            </h1>
            <p className="text-stone-400 font-serif text-sm mt-3 italic">La Carte du Jour et Boissons</p>
          </div>

          <div className="my-6 flex flex-col items-center relative z-10">
            <div className="h-20 w-20 bg-amber-950/60 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400 shadow-xl ring-4 ring-amber-950/40 transition-transform duration-500 hover:rotate-45">
              <ChefHat size={34} className="stroke-[1.5]" />
            </div>
            
            <div className="mt-8 px-6 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-[9px] text-amber-400 uppercase font-black tracking-widest block mb-0.5">Assigned Location</span>
              <span className="text-base font-bold font-serif text-amber-300">Dining Room • Box #{tableNumber}</span>
            </div>
          </div>

          <div className="mb-8 z-10">
            <button
              onClick={() => handlePageChange(1)}
              className="px-10 py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-serif font-black rounded-xl shadow-lg hover:shadow-amber-500/20 hover:scale-[1.03] active:scale-[0.98] transition-all text-xs uppercase tracking-widest cursor-pointer border border-amber-500/20"
            >
              Open Menu Book
            </button>
          </div>

          <div className="absolute top-0 right-10 w-5 h-40 bg-gradient-to-b from-red-700 via-red-600 to-red-800 shadow-lg rounded-b-md border-x border-red-800/10" />
        </div>
      );
    }

    // Back Cover View
    if (page.type === 'back-cover') {
      return (
        <div className={pageClass}>
          <div className="absolute inset-4 border border-stone-200/60 rounded-lg pointer-events-none" />
          
          <div className="text-center mt-12">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#B5A481]">A Tasteful End</span>
            <h2 className="text-4xl font-display font-medium text-stone-900 mt-2 italic">Grazie Mille</h2>
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-amber-600/40 to-transparent mx-auto mt-4 mb-6" />
            <p className="text-stone-500 text-sm italic font-serif leading-relaxed max-w-xs mx-auto">
              Please finalize your choices on the left page. Our culinary crew is waiting with flame and fork to compose your exquisite course.
            </p>
          </div>

          <div className="my-8 flex justify-center">
            <div className="h-20 w-20 bg-[#FAF7EE] border border-[#B5A481]/30 rounded-full flex items-center justify-center text-stone-400 animate-pulse">
              <CheckCircle2 size={32} className="stroke-[1.2] text-[#B5A481]" />
            </div>
          </div>

          <div className="mb-10 text-center">
            <button
              onClick={() => handlePageChange(0)}
              className="px-6 py-2.5 border border-[#B5A481]/50 hover:border-amber-600 text-stone-600 hover:text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all hover:bg-stone-50 active:scale-95 cursor-pointer"
            >
              Close Menu Book
            </button>
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-auto pt-4 border-t border-stone-200/40">
            <span>Fine della Carta</span>
            <span>Page {pages.length} of {pages.length}</span>
          </div>
        </div>
      );
    }

    // Table of Contents (toc)
    if (page.type === 'toc') {
      return (
        <div className={pageClass}>
          <div className="absolute inset-4 border border-stone-200/60 rounded-lg pointer-events-none" />
          
          <div className="text-center mt-6">
            <span className="text-[10px] uppercase tracking-widest font-black text-[#A69374] block">Index della Casa</span>
            <h2 className="text-3xl font-display font-medium text-stone-900 mt-1 mb-2.5">Table of Selections</h2>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent mx-auto" />
          </div>

          <div className="my-6 flex-1 flex flex-col justify-center max-w-xs mx-auto w-full space-y-4">
            {categories.map((cat) => {
              const targetIdx = pages.findIndex(p => p.category === cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    if (targetIdx !== -1) {
                      // Ensure left pages are odd
                      const actualIdx = isDesktop && targetIdx > 0 ? (targetIdx % 2 === 0 ? targetIdx - 1 : targetIdx) : targetIdx;
                      handlePageChange(actualIdx);
                    }
                  }}
                  className="flex items-center justify-between text-left group cursor-pointer hover:bg-stone-50 p-2.5 rounded-lg transition-colors"
                >
                  <span className="font-serif text-lg font-bold tracking-tight text-stone-800 group-hover:text-amber-700 transition-colors">{cat}</span>
                  <div className="flex-1 border-b border-dotted border-stone-300 mx-3 group-hover:border-amber-400 transition-colors" />
                  <span className="font-mono text-[10px] uppercase text-[#A69374] font-extrabold group-hover:text-amber-800 transition-colors">Page {targetIdx + 1}</span>
                </button>
              );
            })}
          </div>

          <div className="text-center mb-4 text-[11px] font-serif italic text-stone-400 px-4">
            "Taste is the anchor of memory." Feel free to navigate by clicking the selections above.
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-auto pt-3 border-t border-stone-200/45">
            <span>Index</span>
            <span>Page 1 of {pages.length}</span>
          </div>
        </div>
      );
    }

    // Chef Welcome View
    if (page.type === 'welcome') {
      return (
        <div className={pageClass}>
          <div className="absolute inset-4 border border-stone-200/60 rounded-lg pointer-events-none" />

          <div className="text-center mt-6">
            <span className="text-[10px] uppercase tracking-widest font-black text-[#A69374] block">Il Buon Giorno</span>
            <h2 className="text-2xl font-display font-medium text-stone-900 mt-1 mb-2.5">Taste and Origin</h2>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent mx-auto" />
          </div>

          <div className="my-6 flex-1 flex flex-col justify-center max-w-sm mx-auto text-center px-4">
            <p className="font-serif italic text-[#A69374] text-xs font-semibold mb-3">A Note From the Hearth</p>
            <p className="font-serif text-sm text-stone-600 leading-relaxed italic mb-5">
              "We believe dining is an intimate communion. Every element of our offering is collected from small volcanic farms, hand-milled, and cooked gently over live copper fires. Take your leisure, trace the leaves of our journal, and discover your preference."
            </p>
            <span className="text-xs font-serif font-black text-amber-800 block">- Chef de Cuisine</span>
            <div className="mt-6 flex justify-center">
              <div className="w-14 h-14 rounded-full border border-stone-200 bg-[#FCFBF8] flex items-center justify-center text-amber-700/60 text-lg font-serif italic font-bold shadow-xs">
                BV
              </div>
            </div>
          </div>

          <div className="text-center mb-4 text-[10px] tracking-wide text-stone-400 font-serif">
            SEEKING EXCELLENCE • ESTABLISHED 1974
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-auto pt-3 border-t border-stone-200/45">
            <span>Prolegomena</span>
            <span>Page 2 of {pages.length}</span>
          </div>
        </div>
      );
    }

    // Category Items List Page
    if (page.type === 'items') {
      return (
        <div className={pageClass}>
          <div className="absolute inset-4 border border-stone-200/60 rounded-lg pointer-events-none" />

          <div>
            <div className="text-center mt-3 mb-6">
              <span className="text-[10px] uppercase tracking-widest font-black text-[#A69374] block">L'Incomparable</span>
              <h2 className="text-2.5xl font-display font-medium text-stone-900 mt-1 tracking-wide">{page.title}</h2>
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent mx-auto mt-2" />
            </div>

            <div className="space-y-6 px-1 md:px-2">
              {page.items?.map((item: MenuItem) => {
                const quantity = cart.find(i => i.id === item.id)?.quantity || 0;
                return (
                  <div key={item.id} className="group flex flex-col pt-1 pb-4 border-b border-stone-100 last:border-0 relative">
                    <div className="flex justify-between items-baseline gap-2">
                      <h3 className="font-serif text-base font-bold text-stone-800 leading-tight group-hover:text-amber-800 transition-colors truncate">{item.name}</h3>
                      <div className="flex-1 border-b border-dotted border-stone-300 mx-2" />
                      <span className="font-serif italic font-extrabold text-amber-900 shrink-0 text-sm">${item.price.toFixed(2)}</span>
                    </div>
                    <p className="text-stone-500 text-xs mt-1 leading-relaxed line-clamp-2 italic font-serif max-w-[90%]">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-3">
                      {quantity > 0 ? (
                        <div className="flex items-center bg-stone-100 p-0.5 rounded-full border border-stone-200/45 shadow-inner">
                          <button 
                            onClick={() => removeFromCart(item.id)} 
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-white text-stone-600 shadow-xs hover:text-stone-900 transition-colors font-bold text-sm cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs px-2.5 text-stone-700 font-bold">{quantity}</span>
                          <button 
                            onClick={() => addToCart(item)} 
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-xs font-bold text-sm cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(item)}
                          className="text-[9px] font-black bg-stone-200/45 hover:bg-[#A69374]/15 active:scale-95 text-stone-800 px-3 py-1 rounded-full transition-all border border-stone-200 flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                        >
                          <Plus size={9} /> Add Choice
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-auto pt-3 border-t border-stone-200/40">
            <span>{page.category}</span>
            <span>Page {pages.findIndex(p => p.id === page.id) + 1} of {pages.length}</span>
          </div>
        </div>
      );
    }

    // Category Creative Visual Page (Polaroid Snapshot Collage)
    if (page.type === 'visual') {
      const visualItems = page.items?.filter((i: any) => i.image_url) || [];
      return (
        <div className={pageClass}>
          <div className="absolute inset-4 border border-stone-200/60 rounded-lg pointer-events-none" />

          <div className="text-center mt-3">
            <span className="text-[10px] uppercase tracking-widest font-black text-[#A69374] block">L'Illustration</span>
            <p className="font-serif italic text-stone-600 text-xs mt-1">Glimpses of Flavor ({page.category})</p>
            <div className="w-12 h-[1px] bg-[#B5A481]/30 mx-auto mt-2" />
          </div>

          {/* Polaroid Snapshots Collage Layout */}
          <div className="flex-1 my-6 flex flex-col items-center justify-center gap-6 relative">
            {visualItems.length > 0 ? (
              <div className="relative w-full max-w-[260px] h-[280px]">
                {/* Polaroid 1 (First visual item) */}
                {visualItems[0] && (
                  <motion.div 
                    whileHover={{ scale: 1.05, rotate: -2, zIndex: 10 }}
                    className="absolute top-2 left-2 bg-gradient-to-tr from-white to-stone-50 p-3 pb-5 rounded-sm shadow-xl border border-stone-200/50 transform -rotate-4 w-[190px]"
                  >
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-3 bg-white/40 shadow-xs backdrop-blur-xs border border-white/60 -rotate-12" />
                    <img 
                      src={visualItems[0].image_url} 
                      alt={visualItems[0].name}
                      referrerPolicy="no-referrer"
                      className="w-full h-32 object-cover border border-stone-200/60 mb-2.5 rounded-2xs grayscale-10 hover:grayscale-0 transition-all"
                    />
                    <p className="font-serif text-[10px] font-bold text-center text-stone-600 truncate">{visualItems[0].name}</p>
                  </motion.div>
                )}

                {/* Polaroid 2 (Second visual item, slightly offset and layered) */}
                {visualItems[1] && (
                  <motion.div 
                    whileHover={{ scale: 1.05, rotate: 2, zIndex: 12 }}
                    className="absolute bottom-2 right-2 bg-gradient-to-tr from-white to-stone-50 p-2.5 pb-4 rounded-sm shadow-lg border border-stone-250/50 transform rotate-6 w-[160px] z-5"
                  >
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-white/50 shadow-xs backdrop-blur-xs border border-white/70 rotate-6" />
                    <img 
                      src={visualItems[1].image_url} 
                      alt={visualItems[1].name}
                      referrerPolicy="no-referrer"
                      className="w-full h-24 object-cover border border-stone-200/60 mb-2 rounded-2xs"
                    />
                    <p className="font-serif text-[9px] font-bold text-center text-stone-600 truncate">{visualItems[1].name}</p>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed border-stone-200 rounded-lg max-w-xs mx-auto">
                <ChefHat className="mx-auto text-stone-300 stroke-[1] mb-2" size={28} />
                <p className="text-[11px] font-serif text-stone-400 italic">Chef custom decorates each dish individually at serving time.</p>
              </div>
            )}
            
            {/* Elegant Calligraphy Ornament */}
            <div className="text-[#A69374] text-xs font-serif italic select-none">
              ✿ ❀ ✿
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-auto pt-3 border-t border-stone-200/40">
            <span>Illustrazione</span>
            <span>Page {pages.findIndex(p => p.id === page.id) + 1} of {pages.length}</span>
          </div>
        </div>
      );
    }

    // Table Recap Draft Invoice Page
    if (page.type === 'recap') {
      return (
        <div className={pageClass}>
          <div className="absolute inset-4 border border-stone-200/60 rounded-lg pointer-events-none" />

          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="text-center mt-3 mb-5">
                <span className="text-[10px] uppercase tracking-widest font-black text-amber-800 block">La Note de Table</span>
                <h2 className="text-2xl font-display font-medium text-stone-900 mt-1">Pending Bill</h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-amber-600/45 to-transparent mx-auto mt-2" />
              </div>

              {/* Handcrafted receipt look */}
              <div className="bg-[#FAF6EC] border border-stone-200 p-5 rounded-md shadow-inner max-w-sm mx-auto font-serif relative">
                <div className="absolute top-3 right-3 text-[9px] uppercase tracking-widest bg-stone-200 px-2.5 py-0.5 rounded text-stone-500 font-mono">
                  Draft Ticket
                </div>
                
                <h3 className="font-serif font-black text-stone-900 border-b border-stone-300 pb-2 mb-3 tracking-tight">Receipt #{Math.floor(2000 + Math.random() * 8000)}</h3>
                
                <div className="space-y-2.5 text-xs text-stone-700 min-h-[140px] max-h-[180px] overflow-y-auto pr-1">
                  {cart.length > 0 ? (
                    cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center pb-2 border-b border-stone-200/50">
                        <div className="flex flex-col">
                          <span className="font-bold text-stone-900 flex items-center gap-1.5">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="text-[9px] text-[#A69374] block">{item.category} item</span>
                        </div>
                        <span className="font-mono text-stone-600">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 text-stone-400 italic font-serif">
                      Your ledger is currently blank. Turn back the leaves to add scrumptious dishes!
                    </div>
                  )}
                </div>

                <div className="border-t border-double border-stone-300 pt-3 mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-stone-500 font-mono">
                    <span>Tax & Svc Charge</span>
                    <span>Inclusive</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-stone-900">
                    <span>Total Due</span>
                    <span className="font-mono text-amber-900">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Complete order triggers */}
            <div className="mt-5 space-y-3 px-4">
              <button 
                onClick={submitOrder}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-4.5 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-serif font-black border border-amber-800/40 rounded-xl transition-all font-semibold uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg active:scale-98 disabled:opacity-40 select-none cursor-pointer"
              >
                {isSubmitting ? "Dispatching..." : "Transmit to Kitchen"}
              </button>
              
              <button 
                onClick={() => {
                  setCart([]);
                  setShowCheckout(false);
                }}
                disabled={cart.length === 0}
                className="w-full text-center text-[10px] uppercase font-black tracking-wider text-stone-400 hover:text-red-700 transition-colors py-2 cursor-pointer"
              >
                Abandon Selections
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-auto pt-3 border-t border-stone-200/40">
            <span>Spesa</span>
            <span>Draft • Page {pages.length - 1} of {pages.length}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  if (settings && settings.service_enabled === 'false') {
    return (
      <div className="min-h-screen bg-stone-950/95 flex flex-col items-center justify-center p-6 text-center font-sans">
        <AlertCircle size={48} className="text-amber-500 mb-4" />
        <h1 className="text-3xl font-serif text-amber-400 font-bold mb-2 tracking-tight">Service Interrupted</h1>
        <p className="text-stone-400 max-w-xs transition-all italic font-serif">We are currently not accepting orders. Please consult our staff.</p>
        <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2 bg-stone-900 border border-stone-800 text-amber-500 text-xs rounded-lg uppercase tracking-widest font-black">Retry Link</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-radial from-stone-900 via-stone-950 to-neutral-950 text-slate-900 font-sans pb-40 relative">
      {/* Background ambience overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-transparent to-black/30 pointer-events-none" />

      {/* Modern App Header */}
      <header className="bg-stone-950/90 border-b border-stone-900 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center text-stone-950 font-serif font-black shadow-lg shadow-amber-600/10 text-lg">
                {settings?.cafe_name?.charAt(0) || "B"}
             </div>
             <div>
                <h1 className="text-lg font-serif font-semibold tracking-wide text-amber-400 leading-none mb-1">{settings?.cafe_name || "Bella Vista"}</h1>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none">Interactive Journal Menu</p>
             </div>
          </div>
          
          {/* Elegantly placed live state */}
          <div className="flex items-center gap-3 bg-stone-900/60 px-4 py-1.5 border border-stone-800 rounded-full text-[10px] text-stone-300 uppercase tracking-wider font-extrabold font-mono">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Connection Live
          </div>
        </div>
      </header>

      {/* Interactive Category Selector Tabs for Mobile and Desktop outer rail */}
      {categories.length > 0 && currentPage > 0 && (
        <div className="lg:hidden flex gap-2 overflow-x-auto px-4 py-3 bg-stone-950/80 backdrop-blur sticky top-16 z-20 border-b border-stone-900 no-scrollbar">
          {categories.map((cat) => {
            const targetIdx = pages.findIndex(p => p.category === cat);
            const isActive = pages[currentPage]?.category === cat || (isDesktop && pages[currentPage + 1]?.category === cat);
            return (
              <button
                key={cat}
                onClick={() => {
                  if (targetIdx !== -1) {
                    handlePageChange(targetIdx);
                  }
                }}
                className={cn(
                  "px-4 py-1.5 text-[9px] font-black rounded-full whitespace-nowrap transition-all shrink-0 uppercase tracking-widest",
                  isActive 
                    ? "bg-amber-600 text-stone-950 shadow-md font-extrabold" 
                    : "bg-stone-900 text-stone-400 border border-stone-800/60 hover:bg-stone-850"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Luxury Frame */}
      <main className="max-w-5xl mx-auto px-4 pt-16 md:pt-20">
        <div className="relative">
          
          {/* Interactive Brass Plaque on the table next to the book */}
          <div className="absolute -top-11 right-4 md:right-8 z-20">
            <div className="bg-gradient-to-b from-[#E6C280] via-[#D1A751] to-[#AA8032] border border-amber-600/30 text-[#2C1900] font-serif px-4 py-2 rounded-md shadow-[0_5px_15px_rgba(0,0,0,0.4)] flex items-center gap-2.5 select-none relative group transition-all hover:scale-102">
              <div className="w-1 h-1 bg-[#402C08] rounded-full absolute top-1 left-1" />
              <div className="w-1 h-1 bg-[#402C08] rounded-full absolute top-1 right-1" />
              <div className="w-1 h-1 bg-[#402C08] rounded-full absolute bottom-1 left-1" />
              <div className="w-1 h-1 bg-[#402C08] rounded-full absolute bottom-1 right-1" />
              
              <div className="flex flex-col text-left">
                <span className="text-[7px] font-black uppercase tracking-wider text-amber-950/70">Assigned</span>
                <span className="text-xs font-bold leading-none tracking-tight">Post #{tableNumber}</span>
              </div>
              
              <select 
                value={tableNumber}
                onChange={(e) => setSearchParams({ table: e.target.value })}
                className="bg-transparent text-amber-950 font-serif font-bold text-xs border-b border-amber-950/30 focus:outline-none cursor-pointer"
              >
                {[1,2,3,4,5,6,7,8,9,10,12,14,15,16,18,20].map(n => (
                  <option key={n} value={n} className="bg-[#1C120C] text-[#E6C280] font-sans">Tab {n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Book Binder Hardcover jacket */}
          <div className="bg-[#261711] rounded-[24px] p-3 md:p-5 shadow-[0_35px_80px_rgba(0,0,0,0.85),_inset_0_2px_4px_rgba(255,255,255,0.06)] relative border-2 border-stone-900 overflow-visible">
            
            {/* Centered binding crease seam (Desktop open states) */}
            {isDesktop && currentPage > 0 && (
              <div className="absolute top-5 bottom-5 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-stone-950/30 via-stone-950/75 to-stone-950/30 z-15 pointer-events-none shadow-lg border-x border-stone-950/40" />
            )}

            {/* Elegantly overlayed Red satin ribbon bookmark down of center fold */}
            {isDesktop && currentPage > 0 && currentPage < pages.length - 1 && (
              <div className="absolute top-0 bottom-[-16px] left-[50.2%] -translate-x-1/2 w-4 bg-gradient-to-r from-red-700 via-red-600 to-red-800 z-16 shadow-[2px_5px_10px_rgba(0,0,0,0.4)] rounded-b-sm border-x border-red-800/10 transform origin-top hover:scale-x-110 active:skew-x-3 transition-transform" />
            )}
            
            {/* 3D Transform page turn arena */}
            <div className="relative overflow-visible" style={{ perspective: "1800px" }}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentPage}
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className={cn(
                    "grid gap-0",
                    isDesktop && currentPage > 0 ? "grid-cols-2 lg:divide-x lg:divide-transparent" : "grid-cols-1"
                  )}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {isDesktop && currentPage > 0 ? (
                    <>
                      <div className="relative" style={{ transformOrigin: "right center" }}>
                        {renderPage(pages[currentPage], "left")}
                      </div>
                      <div className="relative" style={{ transformOrigin: "left center" }}>
                        {currentPage + 1 < pages.length ? (
                          renderPage(pages[currentPage + 1], "right")
                        ) : (
                          <div className="w-full h-full bg-[#FCFAF4] rounded-r-2xl border border-l-0 border-stone-200 shadow-md" />
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ transformOrigin: "center center" }}>
                      {renderPage(pages[currentPage], "single")}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Desktop physical-styled Leather Tabs on outer edge */}
              {currentPage > 0 && (
                <div className="hidden lg:flex flex-col gap-2.5 absolute top-12 -right-[112px] z-20">
                  {categories.map((cat) => {
                    const targetIdx = pages.findIndex(p => p.category === cat);
                    const isActive = pages[currentPage]?.category === cat || (isDesktop && pages[currentPage + 1]?.category === cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          if (targetIdx !== -1) {
                            const actualIdx = targetIdx % 2 === 0 ? targetIdx - 1 : targetIdx;
                            handlePageChange(actualIdx);
                          }
                        }}
                        className={cn(
                          "px-4 py-2.5 text-[9px] font-sans font-black uppercase tracking-widest rounded-r-lg border-y border-r shadow-md transition-all duration-300 origin-left text-left w-24 cursor-pointer truncate",
                          isActive 
                            ? "bg-amber-600 text-stone-950 border-amber-700/60 translate-x-3.5 pl-5 font-black" 
                            : "bg-stone-900/90 text-stone-400 hover:text-white border-stone-800 hover:translate-x-1.5 pl-3"
                        )}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Elegant Page Turn Controls beneath wood frame */}
          <div className="flex items-center justify-between mt-8 px-4 relative z-10">
            <button
              onClick={() => handlePageChange(isDesktop && currentPage > 1 ? currentPage - 2 : currentPage - 1)}
              disabled={currentPage === 0}
              className="px-5 py-3.5 bg-stone-900 border border-stone-800 hover:border-amber-600/30 text-stone-300 hover:text-white font-serif text-[10px] uppercase tracking-widest rounded-xl shadow-lg active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer font-bold"
            >
              &larr; Previous Leaf
            </button>
            
            <span className="text-[10px] text-stone-400 font-mono tracking-widest uppercase bg-stone-900/40 px-4 py-2.5 rounded-full border border-stone-800">
              {isDesktop && currentPage > 0 ? (
                `Pages ${currentPage + 1}-${Math.min(currentPage + 2, pages.length)} • OF ${pages.length}`
              ) : (
                `Page ${currentPage + 1} • OF ${pages.length}`
              )}
            </span>

            <button
              onClick={() => handlePageChange(currentPage === 0 ? 1 : (isDesktop ? currentPage + 2 : currentPage + 1))}
              disabled={isDesktop ? currentPage >= pages.length - 2 : currentPage === pages.length - 1}
              className="px-5 py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 border border-amber-700/30 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-serif text-[10px] uppercase tracking-widest rounded-xl shadow-lg active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer font-black"
            >
              Next Leaf &rarr;
            </button>
          </div>
        </div>
      </main>

      {/* Floating Checkout Bag Indicator */}
      <AnimatePresence>
        {cart.length > 0 && currentPage < pages.length - 2 && (
          <motion.div 
            initial={{ y: 55, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 55, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-6 z-40 pointer-events-none"
          >
            <div className="max-w-md mx-auto bg-stone-950/95 text-white rounded-2xl p-4.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-between pointer-events-auto border border-stone-850">
              <div className="px-3">
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Dishes Drafted</p>
                <p className="text-2xl font-serif font-bold text-amber-500">${total.toFixed(2)}</p>
              </div>
              
              <button 
                onClick={() => {
                  // Jump straight to Recap invoice page
                  const recapIdx = pages.findIndex(p => p.type === "recap");
                  if (recapIdx !== -1) {
                    handlePageChange(isDesktop && recapIdx % 2 === 0 ? recapIdx - 1 : recapIdx);
                  }
                }}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 px-6 py-3 rounded-xl font-serif font-black text-[11px] tracking-wider uppercase transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-600/10 border border-amber-500/20"
              >
                Inspect Ledger <ChevronRight size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegant Toast-style Notification upon Order submission */}
      <AnimatePresence>
        {orderSent && (
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#FCFAF4] p-10 rounded-2xl shadow-2xl border border-stone-200 relative overflow-hidden max-w-sm w-full text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-600" />
              <div className="w-16 h-16 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-200/50">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2.5xl font-display font-medium text-stone-900 mb-2">Order Confirmed</h2>
              <p className="text-stone-500 font-serif text-sm italic leading-relaxed mb-8">
                Your selections for <span className="font-semibold text-stone-800">Station #{tableNumber}</span> have been printed directly onto the kitchen queue. Sip your refreshment while wait.
              </p>
              <button 
                onClick={() => setOrderSent(false)} 
                className="w-full py-3.5 bg-stone-900 hover:bg-stone-850 text-white font-serif text-xs uppercase tracking-widest font-black rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
              >
                Dismiss Journal
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/bella-vista/menu" replace />} />
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

