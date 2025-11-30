import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";

export default function Branches() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [branchList, setBranchList] = useState([]);
  // Step 1 Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 Inputs
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");

  const [loading, setLoading] = useState(false);
  const [createdUserId, setCreatedUserId] = useState(null);

  // Close modal + reset all states
  const closeModal = () => {
    setOpen(false);
    setStep(1);
    setEmail("");
    setPassword("");
    setRole("");
    setBranch("");
    setCreatedUserId(null);
  };
  useEffect(() => {
    const loadBranches = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("branch");

      if (!error && data) {
        const uniqueBranches = [...new Set(data.map(item => item.branch))];
        setBranchList(uniqueBranches);
      }
    };

    loadBranches();
  }, []);

  // ESC to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // ===================== STEP 1 =====================
  const handleCreateAuthUser = async () => {
    if (!email || !password) {
      alert("Please provide email & password");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setCreatedUserId(data.user?.id);
    setStep(2);
  };

  // ===================== STEP 2 =====================
  const handleSaveUserProfile = async () => {
    if (!role || !branch) {
      alert("Please choose role & branch");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("users")
      .insert({
        id: createdUserId,
        role,
        branch,
      });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("User created successfully!");
    closeModal();
  };

  return (
    <div className="p-8 w-full">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">
        Manage Branches
      </h1>

      <button
        onClick={() => setOpen(true)}
        className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-3 rounded-xl font-medium shadow-md transition"
      >
        + Create User
      </button>

      {/* ===================== MODAL ======================= */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-[90%] max-w-lg rounded-xl p-6 shadow-2xl relative">

            {/* Close Button */}
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
              onClick={closeModal}
            >
              ✕
            </button>

            {/* Header */}
            <h2 className="text-2xl font-semibold mb-4 text-purple-700">
              {step === 1 && "Create User Account"}
              {step === 2 && "Assign User Details"}
            </h2>

            {/* ================== STEP 1 ================== */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    className="w-full border rounded-lg p-2 mt-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    className="w-full border rounded-lg p-2 mt-1"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleCreateAuthUser}
                  disabled={loading}
                  className={`w-full py-2 rounded-lg text-white ${loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-purple-700 hover:bg-purple-800"
                    }`}
                >
                  {loading ? "Creating..." : "Next →"}
                </button>
              </div>
            )}

            {/* ================== STEP 2 ================== */}
            {step === 2 && (
              <div className="space-y-4">

                {/* Role */}
                <div>
                  <label className="font-medium text-gray-700">User Role</label>
                  <select
                    className="w-full border rounded-lg p-2 mt-1"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="">Select Role</option>
                    <option value="owner">owner</option>
                    <option value="manager">manager</option>
                    <option value="staff">staff</option>
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="font-medium text-gray-700">User Branch</label>
                  <select
                    className="w-full border rounded-lg p-2 mt-1"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  >
                    <option value="">Select Branch</option>
                    <option value="main">Main Branch</option>
                    <option value="second">Second Branch</option>
                    <option value="third">Third Branch</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveUserProfile}
                  disabled={loading}
                  className={`w-full py-2 rounded-lg text-white ${loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                    }`}
                >
                  {loading ? "Saving..." : "Save User"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
