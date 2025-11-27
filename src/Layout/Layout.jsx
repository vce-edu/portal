import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 mt-16 md:mt-0">
        <Outlet />
      </main>
    </div>
  );
}
