import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";

export default function Branches() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [branchList, setBranchList] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  // Step 1 Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 Inputs
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");

  const [loading, setLoading] = useState(false);
  const [createdUserId, setCreatedUserId] = useState(null);
  // CREATE BRANCH MODAL
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchStep, setBranchStep] = useState(1);
  const [newBranch, setNewBranch] = useState("");

  // Branch Manager inputs
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [managerUserId, setManagerUserId] = useState(null);


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
  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, role, branch, email");

      if (error) {
        console.log(error);
        return;
      }

      // --- Group Data ---
      let groups = {};

      data.forEach((user) => {
        const branchName = user.branch || "Unknown";

        if (!groups[branchName]) {
          groups[branchName] = {
            manager: [],
            staff: [],
            owner: [],
          };
        }

        if (user.role === "manager") groups[branchName].manager.push(user);
        if (user.role === "staff") groups[branchName].staff.push(user);
        if (user.role === "owner") groups[branchName].owner.push(user);
      });

      setGroupedData(groups);
    };

    loadUsers();
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
        email,
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

      <div className="flex gap-4">
        <button
          onClick={() => setOpen(true)}
          className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-3 rounded-xl font-medium shadow-md transition"
        >
          + Create User
        </button>

        <button
          onClick={() => setBranchOpen(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-medium shadow-md transition"
        >
          + Create Branch
        </button>
      </div>


      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Users by Branch</h2>

        {Object.keys(groupedData).map((branchName) => (
          <div key={branchName} className="mb-8 p-4 border rounded-xl bg-gray-50">
            <h3 className="text-xl font-bold mb-3 text-purple-700">
              Branch: {branchName.charAt(0).toUpperCase() + branchName.slice(1)}
            </h3>

            {/* OWNER */}
            {groupedData[branchName].owner.length > 0 && (
              <div className="mb-3">
                <p className="font-semibold">Owner</p>
                {groupedData[branchName].owner.map((u) => (
                  <p key={u.id} className="text-gray-700 ml-4">• {u.email}</p>
                ))}
              </div>
            )}

            {/* MANAGERS */}
            {groupedData[branchName].manager.length > 0 && (
              <div className="mb-3">
                <p className="font-semibold">Manager</p>
                {groupedData[branchName].manager.map((u) => (
                  <p key={u.id} className="text-gray-700 ml-4">• {u.email}</p>
                ))}
              </div>
            )}

            {/* STAFF */}
            {groupedData[branchName].staff.length > 0 && (
              <div>
                <p className="font-semibold">Staff</p>
                {groupedData[branchName].staff.map((u) => (
                  <p key={u.id} className="text-gray-700 ml-4">• {u.email}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>


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
      {branchOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-[90%] max-w-lg rounded-xl p-6 shadow-2xl relative">

            {/* Close button */}
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
              onClick={() => {
                setBranchOpen(false);
                setBranchStep(1);
                setNewBranch("");
                setManagerEmail("");
                setManagerPassword("");
                setManagerUserId(null);
              }}
            >
              ✕
            </button>

            <h2 className="text-2xl font-semibold mb-4 text-purple-700">
              {branchStep === 1 && "Create New Branch"}
              {branchStep === 2 && "Create Manager for This Branch"}
              {branchStep === 3 && "Saving..."}
            </h2>

            {/* STEP 1 — Enter Branch Name */}
            {branchStep === 1 && (
              <div className="space-y-4">

                <div>
                  <label className="font-medium text-gray-700">Branch Name</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 mt-1"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                  />
                </div>

                <button
                  className="w-full bg-purple-700 text-white py-2 rounded-lg hover:bg-purple-800"
                  onClick={() => {
                    if (!newBranch.trim()) {
                      alert("Enter branch name");
                      return;
                    }
                    setBranchStep(2);
                  }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* STEP 2 — Create Manager */}
            {branchStep === 2 && (
              <div className="space-y-4">

                <p className="text-gray-700 mb-2">
                  Creating manager for: <strong>{newBranch}</strong>
                </p>

                <div>
                  <label className="font-medium text-gray-700">Manager Email</label>
                  <input
                    type="email"
                    className="w-full border rounded-lg p-2 mt-1"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Manager Password</label>
                  <input
                    type="password"
                    className="w-full border rounded-lg p-2 mt-1"
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                  />
                </div>

                <button
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                  onClick={async () => {
                    if (!managerEmail || !managerPassword) {
                      alert("Provide email + password");
                      return;
                    }

                    setBranchStep(3);

                    // 1. Create Auth user
                    const { data, error } = await supabase.auth.signUp({
                      email: managerEmail,
                      password: managerPassword,
                    });

                    if (error) {
                      alert(error.message);
                      setBranchStep(2);
                      return;
                    }

                    const managerId = data.user?.id;

                    // 2. Insert into users table
                    const { error: insertError } = await supabase
                      .from("users")
                      .insert({
                        id: managerId,
                        email: managerEmail,
                        role: "manager",
                        branch: newBranch.toLowerCase(),
                      });

                    if (insertError) {
                      alert(insertError.message);
                      setBranchStep(2);
                      return;
                    }

                    alert("Branch & Manager created successfully!");

                    // close modal
                    setBranchOpen(false);
                    setBranchStep(1);
                    setNewBranch("");
                    setManagerEmail("");
                    setManagerPassword("");
                    setManagerUserId(null);

                    // reload users
                    window.location.reload();
                  }}
                >
                  Save Manager
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
