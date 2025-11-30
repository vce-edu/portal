import { useState } from "react";
import { supabase } from "../createClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser, fetchRole, role, loading, setLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    setUser(data.user);
    await fetchRole(data.user.id); 
    
    navigate("/portal/dashboard");

  };
  if (loading) return <Loader/>

  return (
    <div className="w-full flex items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-sm p-8 rounded-2xl border border-gray-200 shadow-xl">
        <h1 className="text-3xl font-extrabold mb-6 text-center tracking-tight text-gray-900"
            style={{ fontFamily: "Poppins, sans-serif" }}>
          Welcome Back
        </h1>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div className="flex flex-col">
            <label className="font-semibold text-gray-800 mb-1 text-sm">
              Username
            </label>
            <input
              type="email"
              placeholder="Enter your username"
              className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col">
            <label className="font-semibold text-gray-800 mb-1 text-sm">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-purple-700 active:scale-[.98] transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
