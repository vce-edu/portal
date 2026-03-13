import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

/**
 * OwnerRoute — renders children only for the `owner` role.
 * Any other authenticated user is redirected to /portal/dashboard.
 */
export default function OwnerRoute({ children }) {
    const { role, loading } = useAuth();

    if (loading) return <Loader />;

    return role === "owner" ? children : <Navigate to="/portal/dashboard" replace />;
}
