import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.user_metadata?.display_name || "User";

  return (
    <div className="p-10 space-y-12">

      {/* -------- Header -------- */}
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p
          className="text-lg mt-2 text-gray-600"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          Welcome back,
          <span className="text-purple-600 font-semibold ml-1">{name}</span>
          .
        </p>
      </div>

      {/* -------- Quick Actions -------- */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          {[
            "Add Student",
            "Add Branch",
            "View Reports",
            "Manage Staff",
            "Upload Study Material",
          ].map((label) => (
            <button
              key={label}
              className="px-5 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 active:scale-95 transition"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* -------- Stats Cards -------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

        <Card title="Total Students" value="1,204" />
        <Card title="Monthly Revenue" value="₹ 78,900" />
        <Card title="Active Branches" value="7" />
        <Card title="Fees Pending" value="₹ 12,500" />
        <Card title="Total Courses" value="23" />
        <Card title="Online Enquiries" value="54" />

      </div>

      {/* -------- Graph Placeholder -------- */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Performance Overview</h2>
        <div className="rounded-2xl border border-gray-200 shadow-lg p-8 bg-white h-64 flex items-center justify-center text-gray-400 text-lg">
          Chart will appear here
        </div>
      </section>

      {/* -------- Recent Activity -------- */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>

        <div className="space-y-4">
          {[
            "New student admitted - Rahul Sharma",
            "Branch 'Lucknow' updated course fee",
            "Generated monthly revenue report",
            "Added 3 new online enquiries",
          ].map((log, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <p className="text-gray-700">{log}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="p-6 rounded-2xl shadow-lg border border-gray-200 bg-white hover:shadow-xl transition">
      <h3 className="text-xl font-bold mb-2 text-purple-700">{title}</h3>
      <p className="text-4xl font-extrabold">{value}</p>
    </div>
  );
}
