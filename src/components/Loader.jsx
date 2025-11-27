export default function Loader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-md">
      <div className="relative w-20 h-20">

        {/* Outer glowing ring */}
        <div className="absolute inset-0 rounded-full border-4 border-purple-500/40 animate-ping"></div>

        {/* Middle slow fade ring */}
        <div className="absolute inset-1 rounded-full border-4 border-purple-700/60 animate-pulse"></div>

        {/* Inner fast spinning arc */}
        <div className="absolute inset-0 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"></div>

      </div>
    </div>
  );
}
