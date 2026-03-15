import React, { useState, useEffect } from "react";
import { supabase, signupSupabase } from "../createClient";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Input, Select } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
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
  const [displayName, setDisplayName] = useState("");
  // CREATE BRANCH MODAL
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchStep, setBranchStep] = useState(1);
  const [newBranch, setNewBranch] = useState("");
  const [facultyList, setFacultyList] = useState([]);
  const [managerMode, setManagerMode] = useState("new"); // "new" or "existing"
  const [selectedFacultyId, setSelectedFacultyId] = useState("");

  // Branch Manager inputs
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");

  // Transfer User state
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [targetBranch, setTargetBranch] = useState("");

  // Deletion state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Close modal + reset all states
  const closeModal = () => {
    setOpen(false);
    setStep(1);
    setEmail("");
    setPassword("");
    setRole("");
    setBranch("");
    setDisplayName("");
    setTransferOpen(false);
    setSelectedUser(null);
    setTargetBranch("");
    setDeleteOpen(false);
    setUserToDelete(null);
  };

  useEffect(() => {
    const loadBranches = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("branch");

      if (!error && data) {
        const uniqueBranches = [...new Set(data.map(item => item.branch))].filter(Boolean);
        setBranchList(uniqueBranches);
      }
    };

    loadBranches();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, role, branch, email, display_name, user_id");

      if (error) {
        console.error(error);
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
            total: 0
          };
        }

        if (user.role === "manager") groups[branchName].manager.push(user);
        if (user.role === "staff") groups[branchName].staff.push(user);
        if (user.role === "owner") groups[branchName].owner.push(user);
        groups[branchName].total++;
      });

      setGroupedData(groups);
      setFacultyList(data);
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

  // ===================== REFINED PROVISIONING =====================
  const handleProvisionUser = async () => {
    if (!email || !role || !branch || !displayName) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    // Generate Password: @#_{first3chars}${role}$
    const namePart = displayName.slice(0, 3).toLowerCase();
    const generatedPassword = `@#_${namePart}$${role.toLowerCase()}$`;

    // 1. Create Auth User
    const { data: authData, error: authError } = await signupSupabase.auth.signUp({
      email,
      password: generatedPassword,
    });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    // 2. Fetch Max Member ID
    const { data: maxIdData } = await supabase
      .from("users")
      .select("user_id")
      .order("user_id", { ascending: false })
      .limit(1);

    const nextMemberId = (maxIdData?.[0]?.user_id || 0) + 1;

    // 3. Insert into users table
    const { error: profileError } = await supabase
      .from("users")
      .insert({
        id: authData.user?.id,
        email,
        role,
        branch,
        display_name: displayName,
        user_id: nextMemberId
      });

    setLoading(false);

    if (profileError) {
      alert(profileError.message);
      return;
    }

    alert(`User provisioned successfully!\nGenerated Password: ${generatedPassword}`);
    closeModal();
    window.location.reload();
  };

  // ===================== TRANSFER =====================
  const handleTransfer = async () => {
    if (!selectedUser || !targetBranch) {
      alert("Please select a target branch");
      return;
    }

    setLoading(true);

    const { error } = await supabase.rpc("transfer_user_branch", {
      user_id_to_transfer: selectedUser.id,
      new_branch: targetBranch,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("User transferred successfully!");
    closeModal();
    window.location.reload();
  };

  // ===================== DELETE =====================
  const handleDeleteUser = async () => {
    console.log(userToDelete);
    console.log(userToDelete.id);
    if (!userToDelete) return;

    setLoading(true);

    const { error } = await supabase.rpc("delete_user_entirely", {
      user_id_to_delete: userToDelete.id,
    });

    setLoading(true);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    alert("User deleted permanently.");
    closeModal();
    window.location.reload();
  };

  return (
    <div className="p-4 md:p-10 space-y-10 bg-gray-50/30 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tighter flex items-center gap-6">
            Branches
            <Badge variant="purple" className="text-sm md:text-lg px-5 py-2 rounded-2xl animate-pulse shadow-lg shadow-purple-100">
              {Object.keys(groupedData).length} Nodes
            </Badge>
          </h1>
          <p className="text-lg md:text-xl mt-4 text-purple-950 font-black max-w-3xl leading-relaxed border-l-8 border-purple-600 pl-8">
            Unified management of regional operations units and administrative access hierarchy.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            onClick={() => setOpen(true)}
            variant="primary"
            size="lg"
            className="w-full sm:w-auto shadow-xl shadow-purple-500/20 rounded-2xl group transition-all hover:scale-105 active:scale-95"
            icon={() => (
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            )}
          >
            Create User
          </Button>

          <Button
            onClick={() => setBranchOpen(true)}
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto shadow-lg rounded-2xl group transition-all hover:scale-105 active:scale-95"
            icon={() => (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )}
          >
            New Branch
          </Button>
        </div>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {Object.keys(groupedData).map((branchName) => (
          <Card key={branchName} noPadding className="bg-white border-none shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden group">
            {/* Card Header Top */}
            <div className="bg-gradient-to-br from-purple-800 to-purple-950 p-10 relative">
              <div className="absolute top-0 right-0 p-6">
                <div className="bg-white/20 backdrop-blur-md rounded-2xl px-4 py-1.5 text-white text-xs font-black uppercase tracking-widest border border-white/20 shadow-xl">
                  Active Node
                </div>
              </div>

              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 truncate pr-24">
                {branchName}
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping shadow-lg shadow-emerald-400"></div>
                <p className="text-purple-100/90 text-sm font-black uppercase tracking-[0.2em] italic">Operational Ledger Unit</p>
              </div>
            </div>

            <div className="p-8 space-y-8 bg-white relative">
              {/* Stats row */}
              <div className="flex justify-between items-center -mt-14 pb-4">
                <div className="flex bg-white shadow-2xl rounded-3xl p-3 border border-purple-100">
                  <div className="px-5 py-3 text-center border-r border-gray-100">
                    <p className="text-[10px] font-black text-purple-950 uppercase tracking-widest mb-1">Managers</p>
                    <p className="text-2xl font-black text-purple-700 tracking-tighter">{groupedData[branchName].manager.length}</p>
                  </div>
                  <div className="px-5 py-3 text-center">
                    <p className="text-[10px] font-black text-purple-950 uppercase tracking-widest mb-1">Staff</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tighter">{groupedData[branchName].staff.length}</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 font-black text-xl italic group-hover:text-purple-600 group-hover:bg-purple-50 transition-all">
                  {branchName.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className="space-y-6">
                {/* OWNER Section */}
                {groupedData[branchName].owner.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="p-1 px-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-[0.2em]">
                        Owners
                      </div>
                      <div className="h-px bg-emerald-100 flex-1"></div>
                    </div>
                    <div className="space-y-2">
                      {groupedData[branchName].owner.map((u) => (
                        <div key={u.id} className="flex items-center gap-4 p-4 bg-emerald-50/30 rounded-3xl border border-emerald-50 group/item hover:bg-emerald-50 transition-all duration-300">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></div>
                          <p className="text-base font-black text-gray-800 truncate flex-1">{u.display_name || u.email}</p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="opacity-0 group-hover/item:opacity-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all border-none shadow-none"
                            onClick={() => {
                              setSelectedUser(u);
                              setTransferOpen(true);
                            }}
                          >
                            Transfer
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="opacity-0 group-hover/item:opacity-100 transition-all border-none font-bold"
                            onClick={() => {
                              setUserToDelete(u);
                              setDeleteOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MANAGERS Section */}
                {groupedData[branchName].manager.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1 px-2.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        Managers
                      </div>
                      <div className="h-px bg-blue-50 flex-1"></div>
                    </div>
                    <div className="space-y-2">
                      {groupedData[branchName].manager.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 p-3 bg-blue-50/30 rounded-2xl border border-blue-50/50 group/item hover:bg-blue-50 transition-colors">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <p className="text-sm font-bold text-gray-700 truncate flex-1">{u.display_name || u.email}</p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="opacity-0 group-hover/item:opacity-100 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all border-none shadow-none"
                            onClick={() => {
                              setSelectedUser(u);
                              setTransferOpen(true);
                            }}
                          >
                            Transfer
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="opacity-0 group-hover/item:opacity-100 transition-all border-none font-bold"
                            onClick={() => {
                              setUserToDelete(u);
                              setDeleteOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STAFF Section */}
                {groupedData[branchName].staff.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1 px-2.5 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        Support Staff
                      </div>
                      <div className="h-px bg-purple-50 flex-1"></div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {groupedData[branchName].staff.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-transparent hover:border-purple-100 hover:bg-white transition-all group/item">
                          <p className="text-xs font-bold text-gray-500 truncate flex-1 italic">{u.display_name || u.email}</p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="opacity-0 group-hover/item:opacity-100 bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all border-none shadow-none"
                            onClick={() => {
                              setSelectedUser(u);
                              setTransferOpen(true);
                            }}
                          >
                            Transfer
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="opacity-0 group-hover/item:opacity-100 transition-all border-none font-bold"
                            onClick={() => {
                              setUserToDelete(u);
                              setDeleteOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                          <svg className="w-4 h-4 text-purple-200 group-hover/item:hidden" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State within card */}
                {groupedData[branchName].total === 0 && (
                  <div className="py-10 text-center space-y-3">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-gray-400 italic">No personnel assigned to this unit.</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ===================== USER MODAL ======================= */}
      <Modal
        isOpen={open}
        onClose={closeModal}
        title="Provision Network Identity"
        maxWidth="max-w-md"
      >
        <div className="p-2 space-y-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <Input
                label="Full Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Abhay Singh"
                className="rounded-2xl"
              />
              <Input
                label="Primary Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@vintech.com"
                className="rounded-2xl"
              />
              <Select
                label="Assigned Access Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={[
                  { value: "", label: "Assign Role" },
                  { value: "owner", label: "Owner (Full System)" },
                  { value: "manager", label: "Manager (Branch Only)" },
                  { value: "staff", label: "Staff (Support)" },
                ]}
                className="rounded-2xl"
              />
              <Select
                label="Regional Operations Branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                options={[
                  { value: "", label: "Select Unit" },
                  ...branchList.map(b => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) })),
                ]}
                className="rounded-2xl"
              />
            </div>

            {displayName && role && (
              <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-xl shadow-purple-100 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-lg font-black italic">P</div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Auto-Generated Credential</p>
                  <p className="text-lg font-black tracking-widest truncate">
                    @#_{displayName.slice(0, 3).toLowerCase()}${role.toLowerCase()}$
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleProvisionUser}
              loading={loading}
              variant="primary"
              className="w-full py-4 rounded-2xl text-lg font-black tracking-tight shadow-xl shadow-purple-100"
            >
              Initialize Identity →
            </Button>
          </div>

          <p className="text-[10px] text-gray-400 font-bold italic text-center px-6 leading-relaxed">
            Provisioning new administrative nodes within the secure boundary.
            All identities are logged for security auditing.
          </p>
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
          setSelectedFacultyId("");
          setManagerMode("new");
        }}
        title={branchStep === 1 ? "Initialize Operational Node" : "Node Administrative Controller"}
        maxWidth="max-w-md"
      >
        <div className="p-2 space-y-8">
          <div className="flex justify-between items-center bg-gray-50 p-1 rounded-2xl">
            <div className={`flex-1 text-center py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${branchStep === 1 ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'text-gray-400'}`}>
              Node Info
            </div>
            <div className={`flex-1 text-center py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${branchStep >= 2 ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'text-gray-400'}`}>
              Controller
            </div>
          </div>

          {branchStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Input
                  label="Branch Operational Name"
                  placeholder="e.g. SOUTH_WING, HQ_BRANCH"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="rounded-2xl"
                />
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 italic">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Impact Analysis</p>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">
                    Initializing a new branch will create a separate operational partition.
                    Requires at least one primary manager for activation.
                  </p>
                </div>
              </div>
              <Button
                className="w-full py-4 rounded-2xl text-lg font-black tracking-tight shadow-xl shadow-purple-100"
                onClick={() => {
                  if (!newBranch.trim()) return alert("Enter branch operational name");
                  setBranchStep(2);
                }}
              >
                Stage Controller →
              </Button>
            </div>
          )}

          {branchStep === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-xl shadow-purple-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-xl font-black italic">!</div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Target Node</p>
                  <p className="text-lg font-black truncate">{newBranch}</p>
                </div>
              </div>

              <div className="flex bg-gray-100 p-1 rounded-2xl">
                <button
                  onClick={() => setManagerMode("existing")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${managerMode === 'existing' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400'}`}
                >
                  Existing Faculty
                </button>
                <button
                  onClick={() => setManagerMode("new")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${managerMode === 'new' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400'}`}
                >
                  New Account
                </button>
              </div>

              {managerMode === 'existing' ? (
                <div className="space-y-4">
                  <Select
                    label="Select Existing Staff"
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                    options={[
                      { value: "", label: "Select Faculty Member" },
                      ...facultyList.map(f => ({ value: f.id, label: `${f.display_name || f.email} (${f.role})` }))
                    ]}
                    className="rounded-2xl"
                  />
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 italic">
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Administrative Note</p>
                    <p className="text-xs text-purple-700 font-medium leading-relaxed">
                      Selecting an existing member will promote them to Manager role and reassign them
                      to the new {newBranch} node.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    label="Manager Authentication ID"
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="admin@vintech.com"
                    className="rounded-2xl"
                  />
                  <Input
                    label="Security Credential"
                    type="password"
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    placeholder="Unique passphrase"
                    className="rounded-2xl"
                  />
                </div>
              )}

              <Button
                variant="success"
                className="w-full py-4 rounded-2xl text-lg font-black tracking-tight shadow-xl shadow-green-100"
                loading={loading}
                onClick={async () => {
                  setLoading(true);

                  if (managerMode === 'existing') {
                    if (!selectedFacultyId) {
                      alert("Please select a faculty member");
                      setLoading(false);
                      return;
                    }

                    const { error } = await supabase
                      .from("users")
                      .update({
                        role: "manager",
                        branch: newBranch.toLowerCase()
                      })
                      .eq("id", selectedFacultyId);

                    if (error) {
                      alert(error.message);
                      setLoading(false);
                      return;
                    }
                  } else {
                    if (!managerEmail || !managerPassword) {
                      alert("Provide credentials for account creation");
                      setLoading(false);
                      return;
                    }

                    const { data, error } = await signupSupabase.auth.signUp({
                      email: managerEmail,
                      password: managerPassword,
                    });

                    if (error) {
                      alert(error.message);
                      setLoading(false);
                      return;
                    }

                    // Get next user_id
                    const { data: maxIdData } = await supabase
                      .from("users")
                      .select("user_id")
                      .order("user_id", { ascending: false })
                      .limit(1);
                    const nextId = (maxIdData?.[0]?.user_id || 0) + 1;

                    const { error: insertError } = await supabase
                      .from("users")
                      .insert({
                        id: data.user?.id,
                        email: managerEmail,
                        role: "manager",
                        branch: newBranch.toLowerCase(),
                        display_name: managerEmail.split('@')[0],
                        user_id: nextId
                      });

                    if (insertError) {
                      alert(insertError.message);
                      setLoading(false);
                      return;
                    }
                  }

                  alert("Operational node & controller initialized.");
                  window.location.reload();
                }}
              >
                Provision Infrastructure
              </Button>
            </div>
          )}
          <p className="text-[10px] text-gray-400 font-bold italic text-center px-6 leading-relaxed">
            Deployment of regional infrastructure nodes requires unique administrative signatures.
            All actions are logged in the global audit trail.
          </p>
        </div>
      </Modal>

      {/* ===================== TRANSFER MODAL ===================== */}
      <Modal
        isOpen={transferOpen}
        onClose={closeModal}
        title="Transfer User Branch"
        maxWidth="max-w-md"
      >
        <div className="p-2 space-y-8">
          <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-xl shadow-purple-200 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-xl font-black italic">T</div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">User to Transfer</p>
              <p className="text-lg font-black truncate">{selectedUser?.email}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <Select
                label="Target Operational Node"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                options={[
                  { value: "", label: "Select Target Branch" },
                  ...branchList.map(b => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) })),
                ]}
                className="rounded-2xl"
              />
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 italic">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Notice</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Transferring this user will immediately reassign their access and data associations
                  to the target branch node.
                </p>
              </div>
            </div>
            <Button
              onClick={handleTransfer}
              loading={loading}
              variant="primary"
              className="w-full py-4 rounded-2xl text-lg font-black tracking-tight shadow-xl shadow-purple-100"
            >
              Confirm Transfer
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 font-bold italic text-center px-6 leading-relaxed">
            Authorized administrative transfer protocol. All movements are recorded for auditing purposes.
          </p>
        </div>
      </Modal>

      {/* ===================== DELETE MODAL ===================== */}
      <Modal
        isOpen={deleteOpen}
        onClose={closeModal}
        title="Confirm permanent deletion"
        maxWidth="max-w-md"
      >
        <div className="p-2 space-y-8">
          <div className="p-4 bg-red-600 text-white rounded-2xl shadow-xl shadow-red-200 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-xl font-black italic">!</div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Target for Deletion</p>
              <p className="text-lg font-black truncate">{userToDelete?.email}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 italic">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Critical Warning</p>
              <p className="text-xs text-red-700 font-medium leading-relaxed">
                This action is irreversible. The user account and all associated profile data will be
                permanently removed from the system authentication and database layers.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleDeleteUser}
                loading={loading}
                variant="danger"
                className="w-full py-4 rounded-2xl text-lg font-black tracking-tight shadow-xl shadow-red-100"
              >
                Delete Permanently
              </Button>
              <Button
                onClick={closeModal}
                variant="secondary"
                className="w-full py-3 rounded-2xl font-bold border-none"
                disabled={loading}
              >
                Cancel Action
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold italic text-center px-6 leading-relaxed">
            Authorized administrative deletion protocol. All destructions are recorded for security auditing.
          </p>
        </div>
      </Modal >

    </div>
  );
}
