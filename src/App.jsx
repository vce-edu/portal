import { Routes, Route } from "react-router-dom";
import Layout from "./Layout/Layout";
import Dashboard from "./Pages/Dashboard";
import Students from "./Pages/Students";
import Performance from "./Pages/Performance";
import Revenue from "./Pages/Revenu";
import Branches from "./Pages/Branches";
import Login from "./Pages/login";
import ProtectedRoute from "./components/ProtectedRoute";
import Fees from "./Pages/Fees";
import Status from "./Pages/Status";
import PersonalNotes from "./Pages/PersonalNotes";
import CreateExam from "./Pages/CreateExam";
import Button from "./components/ui/Button";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/portal" element={<Login />} />

      {/* Protected */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/revenue" element={<Revenue />} />
        <Route path="/students" element={<Students />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/status" element={<Status />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/portal/dashboard" element={<Dashboard />} />
        <Route path="/portal/branches" element={<Branches />} />
        <Route path="/portal/revenue" element={<Revenue />} />
        <Route path="/portal/students" element={<Students />} />
        <Route path="/portal/fees" element={<Fees />} />
        <Route path="/portal/status" element={<Status />} />
        <Route path="/portal/performance" element={<Performance />} />
        <Route path="/portal/notes" element={<PersonalNotes />} />
        <Route path="/portal/create-exam" element={<CreateExam />} />
        <Route path="*" element={<div className="p-10 text-center"><h1>404 - Page Not Found</h1><p>Location: {window.location.pathname}</p><Button onClick={() => window.location.href = '/portal/dashboard'}>Go Dashboard</Button></div>} />
      </Route>
    </Routes>
  );
}