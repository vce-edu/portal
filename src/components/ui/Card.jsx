import React from "react";

const Card = ({ children, className = "", noPadding = false }) => {
    return (
        <div className={`bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden ${className}`}>
            <div className={noPadding ? "" : "p-4 md:p-6"}>
                {children}
            </div>
        </div>
    );
};

const CardHeader = ({ title, subtitle, action, className = "" }) => (
    <div className={`flex items-center justify-between mb-4 md:mb-6 ${className}`}>
        <div>
            <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight">{title}</h3>
            {subtitle && <p className="text-sm text-purple-900 font-semibold mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
    </div>
);

const StatsCard = ({ title, value, subtitle, variant = "purple", icon: Icon }) => {
    const titleColors = {
        purple: "text-purple-600",
        blue: "text-blue-600",
        green: "text-green-600",
        yellow: "text-yellow-600",
        red: "text-red-600",
        success: "text-emerald-600",
        danger: "text-rose-600",
    };

    const isPositive = subtitle?.startsWith("+");
    const isNegative = subtitle?.startsWith("-");

    return (
        <Card className="hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs md:text-sm font-black text-purple-900 uppercase tracking-[0.2em] mb-1 md:mb-2 italic">
                        {title}
                    </p>
                    <p className="text-2xl md:text-4xl font-black text-gray-900 group-hover:scale-105 transition-transform origin-left tracking-tighter">
                        {value}
                    </p>
                    {subtitle && (
                        <p className={`text-[10px] md:text-xs font-bold mt-2 md:mt-3 ${isPositive ? "text-emerald-600" : isNegative ? "text-rose-600" : "text-purple-800"}`}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className={`p-3 rounded-2xl bg-gray-50/50 ${titleColors[variant]} group-hover:bg-white group-hover:shadow-lg transition-all`}>
                        <Icon className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                )}
            </div>
        </Card>
    );
};

export { Card, CardHeader, StatsCard };
