import React from "react";

const Input = ({ label, error, className = "", icon: Icon, ...props }) => {
    return (
        <div className={`flex flex-col gap-1.5 w-full ${className}`}>
            {label && (
                <label className="text-sm font-black text-purple-900 ml-1 uppercase tracking-widest">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                <input
                    className={`
            w-full border border-gray-200 rounded-2xl py-3.5 text-base font-semibold transition outline-none
            focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-300
            ${Icon ? "pl-12 pr-4" : "px-5"}
            ${error ? "border-red-500 ring-red-100 bg-red-50/10" : "bg-white"}
            ${props.readOnly ? "bg-purple-50 cursor-not-allowed text-purple-900/40" : ""}
          `}
                    {...props}
                />
            </div>
            {error && <p className="text-[10px] text-red-500 ml-1 font-bold italic">{error}</p>}
        </div>
    );
};

const Select = ({ label, options, className = "", ...props }) => (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
        {label && (
            <label className="text-sm font-black text-purple-900 ml-1 uppercase tracking-widest">
                {label}
            </label>
        )}
        <select
            className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-base font-semibold bg-white focus:ring-2 focus:ring-purple-500 transition outline-none cursor-pointer appearance-none text-gray-700"
            {...props}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

export { Input, Select };
