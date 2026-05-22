import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { QrCode, LayoutDashboard, ShieldCheck, ArrowRight, Zap, Clock, CreditCard } from "lucide-react";

export default function Landing() {
  const features = [
    { icon: QrCode, title: "QR Ordering", desc: "Customers scan, browse & order in seconds" },
    { icon: Zap, title: "Real-time Updates", desc: "Kitchen gets orders the instant they're placed" },
    { icon: Clock, title: "Order Tracking", desc: "Live status from pending to served" },
    { icon: CreditCard, title: "Easy Payments", desc: "Pay directly at the table without waiting" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-pink-500/10 blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
            <QrCode size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">QuickServerHub</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
            Dashboard
          </Link>
          <Link to="/admin" className="text-sm bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg">
            Admin Panel
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-slate-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Platform is live — serving orders now
          </div>

          <h1 className="font-display text-6xl md:text-7xl font-bold leading-[1.05] mb-6">
            Order smarter,{" "}
            <span className="gradient-text">serve faster</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed mb-12 max-w-xl mx-auto">
            QR-based ordering for cafés & restaurants. No app download needed — customers scan, order, and pay in under 30 seconds.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white font-semibold px-6 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-orange-500/20"
            >
              <LayoutDashboard size={18} />
              Open Dashboard
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/menu/cafe-atlas/1"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold px-6 py-3 rounded-xl transition-all active:scale-95"
            >
              <QrCode size={18} />
              Preview Customer View
            </Link>
          </div>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-28">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="glass rounded-2xl p-6 hover:bg-white/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon size={18} className="text-orange-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Three portals */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              to: "/menu/cafe-atlas/1",
              icon: QrCode,
              label: "Customer Interface",
              desc: "Scan QR → Order → Pay",
              color: "from-emerald-500/20 to-teal-500/20",
              border: "border-emerald-500/20",
              iconColor: "text-emerald-400",
            },
            {
              to: "/dashboard",
              icon: LayoutDashboard,
              label: "Cafe Dashboard",
              desc: "Manage orders & menu",
              color: "from-orange-500/20 to-amber-500/20",
              border: "border-orange-500/20",
              iconColor: "text-orange-400",
            },
            {
              to: "/admin",
              icon: ShieldCheck,
              label: "Central Admin",
              desc: "Control all cafes",
              color: "from-violet-500/20 to-purple-500/20",
              border: "border-violet-500/20",
              iconColor: "text-violet-400",
            },
          ].map((portal) => (
            <Link
              key={portal.to}
              to={portal.to}
              className={`glass rounded-2xl p-7 border ${portal.border} hover:scale-[1.02] transition-all group flex flex-col gap-4`}
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${portal.color} border ${portal.border} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <portal.icon size={22} className={portal.iconColor} />
              </div>
              <div>
                <div className="font-display font-bold text-lg text-white mb-1">{portal.label}</div>
                <div className="text-sm text-slate-500">{portal.desc}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 group-hover:text-white transition-colors mt-auto">
                Open portal <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
