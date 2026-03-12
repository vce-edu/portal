export const formatToDB = (dateStr) => {
    if (!dateStr) return null;
    // Assumes DD/MM/YYYY or DD-MM-YYYY
    const parts = dateStr.split(/[/-]/);
    if (parts.length !== 3) return dateStr;
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

export const formatFromDB = (dateStr) => {
    if (!dateStr) return "";
    // Assumes YYYY-MM-DD
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
};
