export default function Performance() {
  return (
    <div className="p-6">
      <h1 
        className="text-5xl font-extrabold tracking-tight text-gray-900 mb-4"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        Student Performance
      </h1>

      <p className="text-gray-600 text-lg max-w-2xl leading-relaxed">
        Track student results, analyze learning patterns, and identify areas that need improvement.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <div className="p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition bg-white">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Top Performers</h3>
          <p className="text-gray-600 text-sm">
            View students with consistently high scores across subjects.
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition bg-white">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Improvement Needed</h3>
          <p className="text-gray-600 text-sm">
            Identify students who may need extra support or guidance.
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition bg-white">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Performance Trends</h3>
          <p className="text-gray-600 text-sm">
            Analyze class-wide performance data over time.
          </p>
        </div>

      </div>

    </div>
  );
}
