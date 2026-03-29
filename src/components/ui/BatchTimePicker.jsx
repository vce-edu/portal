import React, { useState, useRef, useEffect } from "react";

// 30-min slots from 8 AM to 8 PM
const SLOTS = (() => {
  const list = [];
  for (let h = 8; h <= 20; h++) {
    for (const min of [0, 30]) {
      if (h === 20 && min > 0) break;
      const p   = h < 12 ? "AM" : "PM";
      const h12 = h % 12 || 12;
      list.push({ h24: h, h12, min, p, label: `${String(h12).padStart(2,"0")}:${String(min).padStart(2,"0")} ${p}` });
    }
  }
  return list;
})();

// Auto-guess AM/PM: institute is 8 AM – 8 PM
const autoPeriod = (h) => {
  if (h > 12) return "PM";
  if (h === 12) return "PM";
  if (h >= 8)  return "AM";
  return "PM"; // 1-7 → assume afternoon
};

// Convert h12 + period → h24
const toH24 = (h12, period) => {
  const h = parseInt(h12, 10);
  if (!h) return null;
  if (period === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
};

// ── Single time input ─────────────────────────────────────────────────────────
function TimeInput({ hVal, mVal, period, onCommit }) {
  const displayStr = hVal ? `${String(hVal).padStart(2,"0")}:${String(mVal||"00").padStart(2,"0")}` : "";
  const [raw,  setRaw]  = useState(displayStr);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Sync from parent (e.g. form reset) only when not actively editing
  useEffect(() => { if (!open) setRaw(displayStr); }, [displayStr]); // eslint-disable-line

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Normalise + commit whatever is in the raw input
  const commit = (rawVal, overridePeriod) => {
    const trimmed = rawVal.trim();
    if (!trimmed) {
      onCommit({ h: "", m: "00", period: overridePeriod || period });
      return;
    }
    // HH:MM
    const cm = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (cm) {
      const h   = parseInt(cm[1], 10);
      const h12 = h > 12 ? h - 12 : h || 12;
      const p   = overridePeriod || autoPeriod(h);
      setRaw(`${String(h12).padStart(2,"0")}:${cm[2]}`);
      onCommit({ h: String(h12), m: cm[2], period: p });
      return;
    }
    // Single number → treat as hour
    const nm = trimmed.match(/^(\d{1,2})$/);
    if (nm) {
      const h   = parseInt(nm[1], 10);
      const h12 = h > 12 ? h - 12 : h || 12;
      const p   = overridePeriod || autoPeriod(h);
      setRaw(`${String(h12).padStart(2,"0")}:00`);
      onCommit({ h: String(h12), m: "00", period: p });
      return;
    }
    // Unrecognised – reset
    setRaw(displayStr);
  };

  const handleBlur = () => { commit(raw); setOpen(false); };

  // Dropdown selection: e.preventDefault() keeps input focused so blur doesn't fire first
  const handleSelect = (slot) => {
    const fmt = `${String(slot.h12).padStart(2,"0")}:${String(slot.min).padStart(2,"0")}`;
    setRaw(fmt);
    onCommit({ h: String(slot.h12), m: String(slot.min).padStart(2,"0"), period: slot.p });
    setOpen(false);
  };

  // Period dropdown: commit current raw with the new period
  const handlePeriodChange = (p) => commit(raw, p);

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1">
      <div className="relative">
        <input
          type="text"
          value={raw}
          placeholder="00:00"
          onChange={(e) => { setRaw(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          className="w-[68px] border border-gray-200 rounded-lg px-2 py-2 text-sm font-mono text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition text-center"
        />
        {open && (
          <div className="absolute z-50 top-full mt-1 left-0 w-[130px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-y-auto max-h-48">
            {SLOTS.map((s, i) => (
              <button
                key={i}
                type="button"
                // e.preventDefault() prevents the input from blurring before handleSelect runs
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 hover:text-purple-700 font-mono transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <select
        value={period}
        onChange={(e) => handlePeriodChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-1.5 py-2 text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition cursor-pointer"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
// onChange({ startH24, endH24 }) — both numeric 24h or null
export { toH24 };
export default function BatchTimePicker({ label = "Batch Time", value, onChange }) {
  // value = { sH, sM, sP, eH, eM, eP } (raw strings for display)
  const { sH = "", sM = "00", sP = "AM", eH = "", eM = "00", eP = "AM" } = value || {};

  const emit = (nsH, nsM, nsP, neH, neM, neP) => {
    const startH24 = nsH ? toH24(nsH, nsP) : null;
    const endH24   = neH ? toH24(neH, neP) : null;
    onChange({ sH: nsH, sM: nsM, sP: nsP, eH: neH, eM: neM, eP: neP, startH24, endH24 });
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <TimeInput
          hVal={sH} mVal={sM} period={sP}
          onCommit={({ h, m, period }) => emit(h, m, period, eH, eM, eP)}
        />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest select-none">TO</span>
        <TimeInput
          hVal={eH} mVal={eM} period={eP}
          onCommit={({ h, m, period }) => emit(sH, sM, sP, h, m, period)}
        />
      </div>
    </div>
  );
}
