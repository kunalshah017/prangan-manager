// Helper function to format date in local timezone as YYYY-MM-DD
export const formatDateToLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Function to find the nearest weekend date (Saturday or Sunday)
export const getNearestWeekend = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Already a weekend, return today
    return formatDateToLocal(today);
  }

  // Calculate days until Saturday
  const daysUntilSaturday = 6 - dayOfWeek;

  // Choose the next weekend (Saturday or Sunday)
  const nearestWeekendDate = new Date(today);
  nearestWeekendDate.setDate(today.getDate() + daysUntilSaturday);

  return formatDateToLocal(nearestWeekendDate);
};
