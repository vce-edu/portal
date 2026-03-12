import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-gray-50 p-3 md:p-8 mt-14 md:mt-0">
        <div className="max-w-7xl mx-auto pb-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
