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
            <h3 className="text-lg md:text-xl font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs md:text-sm text-gray-500 font-medium">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
    </div>
);

const StatsCard = ({ title, value, variant = "purple", icon: Icon }) => {
    const titleColors = {
        purple: "text-purple-600",
        blue: "text-blue-600",
        green: "text-green-600",
        yellow: "text-yellow-600",
        red: "text-red-600",
    };

    return (
        <Card className="hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-1 md:mb-2 italic">
                        {title}
                    </p>
                    <p className="text-2xl md:text-4xl font-black text-gray-900 group-hover:scale-105 transition-transform origin-left">
                        {value}
                    </p>
                </div>
                {Icon && (
                    <div className={`p-3 rounded-2xl bg-gray-50 ${titleColors[variant]} group-hover:bg-white group-hover:shadow-lg transition-all`}>
                        <Icon className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                )}
            </div>
        </Card>
    );
};

export { Card, CardHeader, StatsCard };
