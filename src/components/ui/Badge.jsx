import React from "react";

const variants = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
};

const Badge = ({ children, variant = "gray", className = "" }) => {
    return (
        <span className={`
      px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider border
      ${variants[variant]}
      ${className}
    `}>
            {children}
        </span>
    );
};

export default Badge;
