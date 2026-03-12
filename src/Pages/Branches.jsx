import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Input, Select } from "../components/ui/Input";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";

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
  // eslint-disable-next-line no-unused-vars
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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">Branches</h1>
          <p className="text-gray-500 mt-2 font-medium">Manage user access and architectural nodes</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setOpen(true)}
            variant="primary"
            className="flex-1 sm:flex-none shadow-purple-200"
            icon={() => (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            )}
          >
            Create User
          </Button>

          <Button
            onClick={() => setBranchOpen(true)}
            variant="secondary"
            className="flex-1 sm:flex-none"
            icon={() => (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )}
          >
            New Branch
          </Button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.keys(groupedData).map((branchName) => (
          <Card key={branchName} className="hover:shadow-xl transition-all border-purple-50 group">
            <CardHeader
              title={branchName}
              subtitle="Operations Unit"
              action={
                <Badge variant="purple" className="opacity-0 group-hover:opacity-100 transition-opacity">Active</Badge>
              }
            />

            <div className="mt-4 space-y-6">
              {/* OWNER */}
              {groupedData[branchName].owner.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="green" className="text-[10px]">Owners</Badge>
                    <div className="h-px bg-gray-100 flex-1"></div>
                  </div>
                  <div className="space-y-1">
                    {groupedData[branchName].owner.map((u) => (
                      <p key={u.id} className="text-sm font-bold text-gray-700 truncate">{u.email}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* MANAGERS */}
              {groupedData[branchName].manager.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px]">Managers</Badge>
                    <div className="h-px bg-gray-100 flex-1"></div>
                  </div>
                  <div className="space-y-1">
                    {groupedData[branchName].manager.map((u) => (
                      <p key={u.id} className="text-sm font-bold text-gray-700 truncate">{u.email}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* STAFF */}
              {groupedData[branchName].staff.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px]">Staff</Badge>
                    <div className="h-px bg-gray-100 flex-1"></div>
                  </div>
                  <div className="space-y-1">
                    {groupedData[branchName].staff.map((u) => (
                      <p key={u.id} className="text-sm font-medium text-gray-600 truncate">{u.email}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>


      {/* ===================== USER MODAL ======================= */}
      <Modal
        isOpen={open}
        onClose={closeModal}
        title={step === 1 ? "Create User Account" : "Assign User Details"}
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          {step === 1 ? (
            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user email"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set account password"
              />
              <Button
                onClick={handleCreateAuthUser}
                loading={loading}
                className="w-full"
              >
                Next Step →
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Select
                label="User Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={[
                  { value: "", label: "Select Role" },
                  { value: "owner", label: "Owner" },
                  { value: "manager", label: "Manager" },
                  { value: "staff", label: "Staff" },
                ]}
              />
              <Select
                label="User Branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                options={[
                  { value: "", label: "Select Branch" },
                  ...branchList.map(b => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) })),
                ]}
              />
              <Button
                onClick={handleSaveUserProfile}
                loading={loading}
                variant="success"
                className="w-full"
              >
                Finalize & Save
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* ===================== BRANCH MODAL ======================= */}
      <Modal
        isOpen={branchOpen}
        onClose={() => {
          setBranchOpen(false);
          setBranchStep(1);
          setNewBranch("");
          setManagerEmail("");
          setManagerPassword("");
          setManagerUserId(null);
        }}
        title={branchStep === 1 ? "Initialize New Branch" : "Setup Branch Manager"}
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          {branchStep === 1 && (
            <div className="space-y-4">
              <Input
                label="Branch Name"
                placeholder="e.g. downtown, north_wing"
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
              />
              <Button
                className="w-full"
                onClick={() => {
                  if (!newBranch.trim()) return alert("Enter branch name");
                  setBranchStep(2);
                }}
              >
                Next: Manager Setup →
              </Button>
            </div>
          )}

          {branchStep === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-black">?</div>
                <div>
                  <p className="text-xs font-bold text-purple-400 uppercase">Context</p>
                  <p className="text-sm font-bold text-purple-700">Manager for <span className="underline">{newBranch}</span></p>
                </div>
              </div>

              <Input
                label="Manager Email"
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
              />
              <Input
                label="Manager Password"
                type="password"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
              />
              <Button
                variant="success"
                className="w-full"
                loading={branchStep === 3}
                onClick={async () => {
                  if (!managerEmail || !managerPassword) return alert("Provide email + password");
                  setBranchStep(3);

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
                  window.location.reload();
                }}
              >
                Create Branch Infrastructure
              </Button>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
