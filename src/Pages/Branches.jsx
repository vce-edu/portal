export default function Branches() {
  return (
    <div className="space-y-6">

      {/* Page Title */}
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-2">
          Manage Branches
        </h1>
        <p className="text-gray-600 text-lg">
          Create, update, and monitor all your branches here.
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border">
        <h2 className="text-xl font-semibold">Branches Overview</h2>

        <button className="px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl shadow hover:bg-purple-700 transition-all active:scale-95">
          + Add New Branch
        </button>
      </div>

      {/* Placeholder Card Grid (for future real data) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Single Branch Card */}
        <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-lg transition-all cursor-pointer">
          <h3 className="text-xl font-bold mb-1">Main Branch</h3>
          <p className="text-gray-500">Location: Mumbai</p>
        </div>

        {/* Duplicate placeholder cards for UI preview */}
        <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-lg transition-all cursor-pointer">
          <h3 className="text-xl font-bold mb-1">Indore Branch</h3>
          <p className="text-gray-500">Location: Indore</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-lg transition-all cursor-pointer">
          <h3 className="text-xl font-bold mb-1">Lucknow Branch</h3>
          <p className="text-gray-500">Location: Lucknow</p>
        </div>

      </div>

    </div>
  );
}
