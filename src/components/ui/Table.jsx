import React from "react";

const Table = ({ children, className = "" }) => (
    <div className={`overflow-x-auto ${className}`}>
        <table className="w-full text-left border-collapse">
            {children}
        </table>
    </div>
);

const THead = ({ children, className = "" }) => (
    <thead className={`bg-purple-100 border-b-2 border-purple-200 ${className}`}>
        {children}
    </thead>
);

const TBody = ({ children, className = "" }) => (
    <tbody className={`divide-y divide-gray-100 ${className}`}>
        {children}
    </tbody>
);

const TH = ({ children, className = "" }) => (
    <th className={`px-6 py-5 text-sm font-black text-purple-950 uppercase tracking-[0.1em] ${className}`}>
        {children}
    </th>
);

const TD = ({ children, className = "" }) => (
    <td className={`px-6 py-5 text-base font-medium text-gray-700 ${className}`}>
        {children}
    </td>
);

const TR = ({ children, className = "" }) => (
    <tr className={`hover:bg-purple-50/30 transition-colors duration-150 ${className}`}>
        {children}
    </tr>
);

export { Table, THead, TBody, TH, TD, TR };
