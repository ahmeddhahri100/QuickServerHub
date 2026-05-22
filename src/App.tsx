import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CustomerMenu from "./pages/CustomerMenu";
import CafeDashboard from "./pages/CafeDashboard";
import CentralAdmin from "./pages/CentralAdmin";
import Landing from "./pages/Landing";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<Landing />} />

        {/* Customer QR Menu: /menu/:cafeSlug/:tableNumber */}
        <Route path="/menu/:cafeSlug/:tableNumber" element={<CustomerMenu />} />
        {/* Legacy short route */}
        <Route path="/menu" element={<CustomerMenu />} />

        {/* Cafe Owner Dashboard */}
        <Route path="/dashboard" element={<CafeDashboard />} />
        <Route path="/dashboard/:cafeSlug" element={<CafeDashboard />} />

        {/* Central Admin System */}
        <Route path="/admin" element={<CentralAdmin />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
