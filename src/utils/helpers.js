/**
 * Format ISO date string to Indonesian locale
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDate = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('id-ID', {
        day: 'numeric', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
    });
};

/**
 * Format number to Indonesian Rupiah currency
 * @param {number} number - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(number);
};
