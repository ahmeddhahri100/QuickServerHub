import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck, Plus, ToggleLeft, ToggleRight, Trash2, X,
  Loader2, ArrowLeft, Globe, Coffee, TrendingUp, Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Cafe } from "../lib/types";

function cn(...c: (string | false | undefined | null)[]) { return c.filter(Boolean).join(" "); }

// ─── Add Cafe Modal ───────────────────────────────────────────────
function AddCafeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", slug: "", description: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const F = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("cafes").insert({
      name: form.name, slug: form.slug, description: form.description, address: form.address, status: "active"
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.form initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onSubmit={save} className="w-full max-w-md bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-lg">Add New Cafe</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
        </div>
        {err && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{err}</div>}
        {[
          { label: "Cafe Name", key: "name" as const, placeholder: "Café Atlas" },
          { label: "Slug (URL)", key: "slug" as const, placeholder: "cafe-atlas" },
          { label: "Description", key: "description" as const, placeholder: "A warm café..." },
          { label: "Address", key: "address" as const, placeholder: "Tunis, Tunisia" },
        ].map(f => (
          <div key={f.key}>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 block">{f.label}</label>
            <input required={f.key === "name" || f.key === "slug"} placeholder={f.placeholder}
              value={form[f.key]}
              onChange={e => {
                F(f.key, e.target.value);
                if (f.key === "name") F("slug", autoSlug(e.target.value));
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50 placeholder:text-slate-700" />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-sm font-semibold transition-all">Cancel</button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50">
            {saving ? "Creating..." : "Create Cafe"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

// ─── Cafe Card ────────────────────────────────────────────────────
function CafeCard({ cafe, onToggle, onDelete }: {
  cafe: Cafe & { orderCount?: number; revenue?: number };
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isActive = cafe.status === "active";

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white/5 border rounded-2xl p-5 flex flex-col gap-4 transition-all",
        isActive ? "border-white/10 hover:border-orange-500/20" : "border-white/5 opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
            isActive ? "bg-orange-500/15 border border-orange-500/20" : "bg-white/5 border border-white/10")}>
            <Coffee size={18} className={isActive ? "text-orange-400" : "text-slate-600"} />
          </div>
          <div>
            <div className="font-display font-bold text-white text-base leading-tight">{cafe.name}</div>
            <div className="text-xs text-slate-500 font-mono">/{cafe.slug}</div>
          </div>
        </div>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest",
          isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-red-500/15 text-red-400 border-red-500/20")}>
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {cafe.description && <p className="text-xs text-slate-500 leading-relaxed">{cafe.description}</p>}
      {cafe.address && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Globe size={11} /> {cafe.address}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Users, label: "Orders", val: cafe.orderCount ?? 0 },
          { icon: TrendingUp, label: "Revenue", val: `${(cafe.revenue ?? 0).toFixed(0)} DT` },
        ].map(s => (
          <div key={s.label} className="bg-white/5 rounded-xl p-2.5 flex items-center gap-2">
            <s.icon size={13} className="text-slate-600" />
            <div>
              <div className="text-[10px] text-slate-600">{s.label}</div>
              <div className="text-xs font-bold text-white">{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={onToggle}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border",
            isActive
              ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20")}>
          {isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          {isActive ? "Deactivate" : "Activate"}
        </button>
        <Link to={`/dashboard`}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all">
          Open Dashboard
        </Link>
        <button onClick={onDelete}
          className="p-2.5 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-all">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main: Central Admin ──────────────────────────────────────────
export default function CentralAdmin() {
  const [cafes, setCafes] = useState<(Cafe & { orderCount?: number; revenue?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => { loadCafes(); }, []);

  async function loadCafes() {
    setLoading(true);
    const { data: cafesData } = await supabase.from("cafes").select("*").order("created_at", { ascending: false });
    if (!cafesData) { setLoading(false); return; }

    // Load order stats per cafe
    const enriched = await Promise.all(cafesData.map(async (c) => {
      const { data: orders } = await supabase.from("orders").select("total, status").eq("cafe_id", c.id);
      return {
        ...c,
        orderCount: orders?.length || 0,
        revenue: orders?.filter(o => o.status === "paid").reduce((s, o) => s + o.total, 0) || 0,
      };
    }));

    setCafes(enriched);
    setLoading(false);
  }

  async function toggleStatus(cafe: Cafe) {
    const next = cafe.status === "active" ? "inactive" : "active";
    await supabase.from("cafes").update({ status: next }).eq("id", cafe.id);
    setCafes(prev => prev.map(c => c.id === cafe.id ? { ...c, status: next as any } : c));
  }

  async function deleteCafe(id: string) {
    if (!confirm("Delete this cafe and ALL its data? This cannot be undone.")) return;
    await supabase.from("cafes").delete().eq("id", id);
    setCafes(prev => prev.filter(c => c.id !== id));
  }

  const filtered = cafes.filter(c => filter === "all" || c.status === filter);
  const totalRevenue = cafes.reduce((s, c) => s + (c.revenue || 0), 0);
  const activeCount = cafes.filter(c => c.status === "active").length;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Fixed blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-orange-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <ShieldCheck size={18} className="text-violet-400" />
                <h1 className="font-display font-bold text-white text-2xl">Central Admin</h1>
              </div>
              <p className="text-sm text-slate-500">Manage all cafes on the platform</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-violet-500/20">
            <Plus size={16} /> Add Cafe
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Cafes", val: cafes.length, icon: Coffee, color: "text-violet-400" },
            { label: "Active", val: activeCount, icon: ToggleRight, color: "text-emerald-400" },
            { label: "Total Orders", val: cafes.reduce((s, c) => s + (c.orderCount || 0), 0), icon: Users, color: "text-orange-400" },
            { label: "Total Revenue", val: `${totalRevenue.toFixed(0)} DT`, icon: TrendingUp, color: "text-pink-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <s.icon size={18} className={cn(s.color, "mb-2")} />
              <div className="font-display font-bold text-white text-xl">{s.val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6">
          {(["all", "active", "inactive"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all",
                filter === f ? "bg-white/15 text-white" : "text-slate-500 hover:text-white hover:bg-white/5")}>
              {f} ({f === "all" ? cafes.length : cafes.filter(c => c.status === f).length})
            </button>
          ))}
        </div>

        {/* Cafes grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="text-violet-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filtered.map(cafe => (
                <CafeCard key={cafe.id} cafe={cafe}
                  onToggle={() => toggleStatus(cafe)}
                  onDelete={() => deleteCafe(cafe.id)} />
              ))}
            </AnimatePresence>
            {filtered.length === 0 && !loading && (
              <div className="col-span-full text-center py-24 text-slate-600">
                <Coffee size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No cafes found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddCafeModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); loadCafes(); }} />}
      </AnimatePresence>
    </div>
  );
}
