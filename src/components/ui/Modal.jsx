import React, { useEffect } from "react";
import Button from "./Button";

const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = "max-w-md" }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Content */}
            <div className={`bg-white w-full ${maxWidth} rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden`}>
                {/* Header */}
                <div className="px-6 py-4 md:px-8 md:py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <h2 className="text-xl md:text-2xl font-black text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4 md:px-8 md:py-6 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 md:px-8 md:py-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
