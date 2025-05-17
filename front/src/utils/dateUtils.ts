/**
 * Returns a date key in YYYY-MM-DD format
 * @param date - Date object or string
 * @returns Date key string
 */
export const getDateKey = (date: Date | string): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date');
    }
    return dateObj.toISOString().split('T')[0];
};

/**
 * Formats a date for display
 * @param date - Date object or string
 * @returns Formatted date string
 */
export const formatDateForDisplay = (date: Date | string): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
    }
    return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Validates if a date string is valid
 * @param date - Date string
 * @returns Boolean indicating if date is valid
 */
export const isValidDate = (date: string): boolean => {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
};