import React from "react";

const Input = ({ label, error, className = "", icon: Icon, ...props }) => {
    return (
        <div className={`flex flex-col gap-1.5 w-full ${className}`}>
            {label && (
                <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">
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
            w-full border border-gray-200 rounded-xl py-2.5 text-sm transition outline-none
            focus:ring-2 focus:ring-purple-500 focus:border-transparent
            ${Icon ? "pl-11 pr-4" : "px-4"}
            ${error ? "border-red-500 ring-red-100" : "bg-white"}
            ${props.readOnly ? "bg-gray-50 cursor-not-allowed text-gray-500" : ""}
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
            <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">
                {label}
            </label>
        )}
        <select
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 transition outline-none cursor-pointer appearance-none"
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
