import React from "react";

const variants = {
    primary: "bg-purple-600 text-white hover:bg-purple-700 active:scale-95 shadow-md shadow-purple-100",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95",
    outline: "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95",
    danger: "bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-md shadow-red-100",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-100",
    success: "bg-green-600 text-white hover:bg-green-700 active:scale-95",
};

const sizes = {
    xs: "px-2 py-1 text-[10px]",
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm md:text-base",
    lg: "px-8 py-3 text-lg",
    full: "w-full px-5 py-2.5 text-base",
};

const Button = ({
    children,
    variant = "primary",
    size = "md",
    className = "",
    icon: Icon,
    ...props
}) => {
    return (
        <button
            className={`
        inline-flex items-center justify-center gap-2 
        font-bold rounded-xl transition-all duration-200 
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
            {...props}
        >
            {Icon && <Icon className="w-5 h-5" />}
            {children}
        </button>
    );
};

export default Button;
