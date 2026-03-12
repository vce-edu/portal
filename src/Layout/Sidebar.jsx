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
          p-5 flex flex-col gap-2 z-50 transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          shadow-2xl md:shadow-none
        `}
      >
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

        <h1 className="text-3xl font-black tracking-tighter mb-8 hidden md:block text-center bg-white/10 py-4 rounded-2xl">
          Vintech
        </h1>

        {/* Menu Items */}
        {items.map((item) => (
          <NavLink
            key={item.name}
            to={item.route}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${isActive ? "bg-purple-700" : "hover:bg-purple-800"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-xl mt-auto"
        >
          Logout
        </button>
      </div>
    </>
  );
}
