import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../createClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchRole(user.id);
      } else {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  async function fetchRole(userId) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, branch")
      .eq("id", userId)
      .single();

    setRole(profile?.role || null);
    setBranch(profile?.branch);
    setLoading(false);
  }
  const logout = async () => {
  await supabase.auth.signOut();
  setUser(null);
  setRole(null);
  setLoading(false);
};

  return (
    <AuthContext.Provider value={{ user, role, branch, setUser, fetchRole, loading, setLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
