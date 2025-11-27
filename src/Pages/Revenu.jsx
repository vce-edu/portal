export default function Revenue() {
  return (
    <div className="space-y-8">

      {/* Page Title */}
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-2">
          Revenue Analysis
        </h1>
        <p className="text-gray-600 text-lg">
          Track income, growth, and financial performance across branches.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-gray-500 text-sm">Total Revenue</p>
          <h2 className="text-3xl font-bold mt-1">₹4,52,000</h2>
          <p className="text-green-600 font-semibold mt-2">▲ +12% this month</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-gray-500 text-sm">Active Students</p>
          <h2 className="text-3xl font-bold mt-1">312</h2>
          <p className="text-green-600 font-semibold mt-2">▲ +5% growth</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-gray-500 text-sm">Branch Count</p>
          <h2 className="text-3xl font-bold mt-1">6</h2>
          <p className="text-purple-600 font-semibold mt-2">Stable</p>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border">
        <h3 className="text-2xl font-bold mb-4">Revenue Trends</h3>

        <div className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
          {/* Placeholder for your future chart component */}
          <p>Chart Coming Soon...</p>
        </div>
      </div>

      {/* Table Placeholder */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border">
        <h3 className="text-2xl font-bold mb-4">Branch-Wise Revenue</h3>

        <div className="h-56 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
          {/* Placeholder for branch revenue table */}
          <p>Table Coming Soon...</p>
        </div>
      </div>

    </div>
  );
}
