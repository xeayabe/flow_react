/**
 * Format transaction date for display
 * Returns: "Today", "Yesterday", or "Jan 15"
 */
export function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to compare dates only
  const resetTime = (d: Date) => {
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const dateOnly = resetTime(new Date(date));
  const todayOnly = resetTime(new Date(today));
  const yesterdayOnly = resetTime(new Date(yesterday));

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  }

  if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  }

  // Format as "Jan 15" for older dates
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
