import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../createClient";

// ================= HELPERS =================
const isSameMonth = (dateString) => {
  if (!dateString) return false;
  const paid = new Date(dateString);
  const now = new Date();
  return (
    paid.getMonth() === now.getMonth() &&
    paid.getFullYear() === now.getFullYear()
  );
};


export default function Status() {
  const { branch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [forceReload, setForceReload] = useState(false);

  // ----- BRANCH PREFIX -----
  const getBranchPrefix = (branch) => {
    if (!branch || branch === "all") return null;
    return branch[0].toLowerCase(); // m/s/t
  };
  const prefix = getBranchPrefix(branch);

  // ----- BRANCH-SPECIFIC CACHE -----
  const CACHE_KEY = `status_cache_data_${branch || "all"}`;
  const CACHE_TIME_KEY = `status_cache_time_${branch || "all"}`;
  const CACHE_DURATION = 300000; // 5 minutes

  useEffect(() => {
    const loadStatus = async () => {
      setLoading(true);
      const now = Date.now();

      // ================= CACHE CHECK =================
      const cached = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

      if (
        !forceReload &&
        cached &&
        cachedTime &&
        now - Number(cachedTime) < CACHE_DURATION
      ) {
        let cachedData = JSON.parse(cached);

        // ---- Apply branch filter to cached data ----
        if (prefix) {
          cachedData = cachedData.filter((item) =>
            item.roll_num.toLowerCase().startsWith(prefix)
          );
        }

        setData(cachedData);
        setLoading(false);
        return;
      }

      // ================= FETCH NEW DATA =================
      try {
        const res = await fetch(
          "https://script.google.com/macros/s/AKfycbxX2zyjsqYix170FYCCtLzUizam1Q2POetKUMCih32LzA1DuzxOxxYwgttK86xqTp5S/exec",
          {
            method: "POST",
            body: JSON.stringify({ proceed: "proceed" }),
          }
        );

        const json = await res.json();
        if (json.success) {
          let filteredData = json.result;

          // ---- Apply branch filter ----
          if (prefix) {
            filteredData = filteredData.filter((item) =>
              item.roll_num.toLowerCase().startsWith(prefix)
            );
          }

          // ===== FETCH LAST PAID FROM SUPABASE =====
          const { data: feesData, error: feesError } = await supabase
            .from("fees")
            .select("roll_number, last_paid");

          if (!feesError && feesData) {
            const lastPaidMap = {};
            feesData.forEach((row) => {
              lastPaidMap[row.roll_number.toLowerCase()] = row.last_paid;
            });

            // Merge into Google Sheet results
            filteredData = filteredData.map((item) => ({
              ...item,
              last_paid: lastPaidMap[item.roll_num.toLowerCase()] || null,
            }));
          }

          // Save raw merged data in state
          setData(filteredData);

          // ---- Save filtered data to branch-specific cache ----
          localStorage.setItem(CACHE_KEY, JSON.stringify(filteredData));
          localStorage.setItem(CACHE_TIME_KEY, String(now));
        } else {
          setError("Unable to fetch fee status");
        }
      } catch (err) {
        setError("Network error while fetching fee status");
      } finally {
        setLoading(false);
        setForceReload(false);
      }
    };

    loadStatus();
  }, [forceReload, branch]);

  const sortByUpcoming = (list) => {
    return list.sort((a, b) => {
      const isUpcomingA = !a.last_paid || !isSameMonth(a.last_paid);
      const isUpcomingB = !b.last_paid || !isSameMonth(b.last_paid);

      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;
      return 0;
    });
  };

  // ================= SEARCH FILTER & SPLIT BY BRANCH =================
  const searchLower = search.toLowerCase();

  const mainBranchData = sortByUpcoming(
    data.filter(
      (item) =>
        item.roll_num.toLowerCase().startsWith("m") &&
        (item.roll_num.toLowerCase().includes(searchLower) ||
          item.name.toLowerCase().includes(searchLower))
    )
  );

  const secondBranchData = sortByUpcoming(
    data.filter(
      (item) =>
        item.roll_num.toLowerCase().startsWith("s") &&
        (item.roll_num.toLowerCase().includes(searchLower) ||
          item.name.toLowerCase().includes(searchLower))
    )
  );

  const thirdBranchData = sortByUpcoming(
    data.filter(
      (item) =>
        item.roll_num.toLowerCase().startsWith("t") &&
        (item.roll_num.toLowerCase().includes(searchLower) ||
          item.name.toLowerCase().includes(searchLower))
    )
  );

  // ================= CLEAR CACHE =================
  const refreshNow = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
    setForceReload(true);
  };

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Fees Status</h1>

      {/* Search + Refresh */}
      <div className="flex justify-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by Roll or Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-96 px-4 py-2 border rounded shadow-sm focus:ring focus:ring-blue-300"
        />
        <button
          onClick={refreshNow}
          className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-center text-lg">Loading…</p>}
      {error && <p className="text-center text-red-600">{error}</p>}
      {!loading && !error && (
        <>
          {(!prefix || prefix === "m") && (
            <BranchTable title="Main Branch" data={mainBranchData} />
          )}
          {(!prefix || prefix === "s") && (
            <BranchTable title="Second Branch" data={secondBranchData} />
          )}
          {(!prefix || prefix === "t") && (
            <BranchTable title="Third Branch" data={thirdBranchData} />
          )}
        </>
      )}
    </div>
  );
}

// ================== REUSABLE TABLE COMPONENT ==================
const BranchTable = ({ title, data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">{title}</h2>
        <p className="text-gray-600 italic text-center py-4">
          No records found.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-400">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="border border-gray-400 px-4 py-2">Roll</th>
              <th className="border border-gray-400 px-4 py-2">Name</th>
              <th className="border border-gray-400 px-4 py-2">Pending</th>
              <th className="border border-gray-400 px-4 py-2">Total</th>
              <th className="border border-gray-400 px-4 py-2">Expected</th>
              <th className="border border-gray-400 px-4 py-2">Completed</th>
              <th className="border border-gray-400 px-4 py-2">Remaining</th>
              <th className="border border-gray-400 px-4 py-2">Month Fees</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => {
              const isPaidThisMonth =
                item.last_paid && isSameMonth(item.last_paid);

              return (
                <tr key={i} className="hover:bg-gray-100">
                  <td className="border border-gray-400 px-4 py-2">
                    {item.roll_num}
                  </td>
                  <td className="border border-gray-400 px-4 py-2 capitalize">
                    {item.name}
                  </td>
                  <td
                    className={`border border-gray-400 px-4 py-2 font-semibold ${
                      item.pending ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {item.pending ? "Pending" : "Cleared"}
                  </td>

                  <td className="border border-gray-400 px-4 py-2">
                    {item.total_string}
                  </td>
                  <td className="border border-gray-400 px-4 py-2">
                    {item.expected_installments}
                  </td>
                  <td className="border border-gray-400 px-4 py-2">
                    {item.completed_installments}
                  </td>
                  <td className="border border-gray-400 px-4 py-2">
                    {item.remaining_installments}
                  </td>

                  <td className="border border-gray-400 px-4 py-2 font-semibold">
                    {isPaidThisMonth ? (
                      <span className="text-green-600">Paid</span>
                    ) : (
                      <span className="text-red-600">Upcoming</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
