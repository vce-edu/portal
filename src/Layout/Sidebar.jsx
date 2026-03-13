import { useNavigate, NavLink } from "react-router-dom";
import { menuConfig } from "../config/menuConfig";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function Sidebar() {
  const { role, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile drawer

  if (loading || !role) return null;

  const items = menuConfig[role] || [];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 bg-purple-900 text-white z-40 shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Vintech</h1>

        <button
          onClick={() => setOpen(true)}
          className="p-2 hover:bg-purple-800 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* OVERLAY for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 w-64 bg-purple-900 text-white 
          flex flex-col z-50 transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          shadow-2xl md:shadow-none
        `}
      >
        {/* ── Fixed top: close btn (mobile) + logo ── */}
        <div className="flex-shrink-0 p-5 pb-0">
          {/* Close button (mobile only) */}
          <div className="flex justify-between items-center md:hidden mb-4">
            <span className="font-bold text-lg">Menu</span>
            <button
              className="p-2 hover:bg-purple-800 rounded-lg transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h1 className="text-3xl font-black tracking-tighter mb-4 hidden md:block text-center bg-white/10 py-4 rounded-2xl">
            Vintech
          </h1>
        </div>

        {/* ── Scrollable menu items ── */}
        <nav className="flex-1 overflow-y-auto px-5 py-3 space-y-1 scrollbar-thin scrollbar-track-purple-900 scrollbar-thumb-purple-700">
          {items.map((item) => (
            <NavLink
              key={item.name}
              to={item.route}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded ${isActive ? "bg-purple-700" : "hover:bg-purple-800"}`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* ── Always-visible logout ── */}
        <div className="flex-shrink-0 p-5 pt-3 border-t border-purple-800">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
