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

export const isWeekendDate = (date: string) => {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 || day === 6;
};

export const getWeekendOnOrAfter = (date: string, maxDate: string) => {
  const candidate = new Date(`${date}T00:00:00.000Z`);
  for (let offset = 0; offset <= 6; offset += 1) {
    const next = new Date(candidate);
    next.setUTCDate(candidate.getUTCDate() + offset);
    const nextDate = next.toISOString().slice(0, 10);
    if (nextDate > maxDate) return "";
    if (isWeekendDate(nextDate)) return nextDate;
  }
  return "";
};

export const getWeekendOnOrBefore = (date: string, minDate: string) => {
  const candidate = new Date(`${date}T00:00:00.000Z`);
  for (let offset = 0; offset <= 6; offset += 1) {
    const previous = new Date(candidate);
    previous.setUTCDate(candidate.getUTCDate() - offset);
    const previousDate = previous.toISOString().slice(0, 10);
    if (previousDate < minDate) return "";
    if (isWeekendDate(previousDate)) return previousDate;
  }
  return "";
};

export const getClosestWeekendWithinRange = (
  date: string,
  minDate: string,
  maxDate: string,
) => {
  const boundedDate =
    date < minDate ? minDate : date > maxDate ? maxDate : date;
  if (isWeekendDate(boundedDate)) return boundedDate;

  const candidate = new Date(`${boundedDate}T00:00:00.000Z`);
  for (let offset = 1; offset <= 6; offset += 1) {
    const next = new Date(candidate);
    next.setUTCDate(candidate.getUTCDate() + offset);
    const nextDate = next.toISOString().slice(0, 10);
    if (nextDate <= maxDate && isWeekendDate(nextDate)) return nextDate;

    const previous = new Date(candidate);
    previous.setUTCDate(candidate.getUTCDate() - offset);
    const previousDate = previous.toISOString().slice(0, 10);
    if (previousDate >= minDate && isWeekendDate(previousDate))
      return previousDate;
  }

  return "";
};
