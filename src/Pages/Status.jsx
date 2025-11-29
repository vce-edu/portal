import React, { useEffect, useState } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";

export default function Status() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const { branch } = useAuth();

  // If branch is all → default to "main"
  const [selectedBranch, setSelectedBranch] = useState(
    branch === "all" ? "main" : branch
  );

  async function fetchStatus(branchToUse) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        "https://pgvwjskubfonmirtaodo.supabase.co/functions/v1/status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branch: branchToUse })
        }
      );

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to load");
        return;
      }

      setRows(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // On mount → handle both cases (all or specific branch)
  useEffect(() => {
    fetchStatus(selectedBranch);
  }, []);

  // If user changes dropdown selection
  useEffect(() => {
    if (branch === "all") {
      fetchStatus(selectedBranch);
    }
  }, [selectedBranch]);

  return (
    <div className="p-8 text-black">
      <h1 className="text-4xl font-bold mb-6">Fees Status</h1>

      {/* If admin with access to all branches */}
      {branch === "all" && (
        <div className="mb-6">
          <label className="font-medium mr-3">Select Branch:</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="main">Main</option>
            <option value="second">Second</option>
            <option value="third">Third</option>
          </select>
        </div>
      )}

      {loading && <div className="text-lg">Loading...</div>}
      {error && <div className="text-red-600 text-lg">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table
            className="min-w-full border border-gray-200 rounded-lg bg-white"
            style={{ borderRadius: "12px", overflow: "hidden" }}
          >
            <thead className="bg-purple-700 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Roll No</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Student Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Total Expected</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Total Paid</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item, i) => (
                <tr
                  key={i}
                  className={`border-b ${
                    i % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-purple-100 transition`}
                >
                  <td className="px-6 py-3 text-sm">{item.roll_number}</td>
                  <td className="px-6 py-3 text-sm">{item.student_name}</td>
                  <td className="px-6 py-3 text-sm">₹{item.expected_total}</td>
                  <td className="px-6 py-3 text-sm">₹{item.total_paid}</td>
                  <td
                    className={`px-6 py-3 text-sm font-semibold ${
                      item.status.includes("UP")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {item.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
