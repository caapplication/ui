/**
 * Formats a date string to Indian Standard Time (IST) - UTC+5:30.
 * Format: "DD MMM YYYY, hh:mm am/pm"
 * Example: "31 Jan 2026, 10:26 am"
 * 
 * @param {string|Date} dateValue - The date to format (UTC string or Date object)
 * @returns {string} - Formatted date string in IST
 */
export const formatToIST = (dateValue) => {
  if (!dateValue) return 'Never';

  // If string implies ISO format (contains T and :) but has no timezone (Z or +), append Z to force UTC
  let inputDate = dateValue;
  if (typeof dateValue === 'string' && dateValue.includes('T') && dateValue.includes(':') && !dateValue.endsWith('Z') && !dateValue.includes('+')) {
    inputDate += 'Z';
  }

  const date = new Date(inputDate);

  // Check if valid date
  if (isNaN(date.getTime())) return 'Invalid Date';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata', // Force IST timezone
  });
};
