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
      <div className="md:hidden flex items-center justify-between p-4 bg-purple-900 text-white">
        <h1 className="text-2xl font-bold">Vintech</h1>

        <button onClick={() => setOpen(true)} className="text-3xl font-bold">
          ≡
        </button>
      </div>

      {/* SIDEBAR (drawer on mobile, fixed on desktop) */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 w-64 bg-purple-900 text-white 
          p-4 flex flex-col gap-3 z-50 transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Close button (mobile only) */}
        <button
          className="md:hidden absolute top-4 right-4 text-3xl font-bold"
          onClick={() => setOpen(false)}
        >
          ×
        </button>

        <h1 className="text-3xl text-center font-bold mt-8 md:mt-0 mb-6">
          Vintech
        </h1>

        {/* Menu Items */}
        {items.map((item) => (
          <NavLink
            key={item.name}
            to={item.route}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${
                isActive ? "bg-purple-700" : "hover:bg-purple-800"
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
