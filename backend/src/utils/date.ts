/**
 * Get current date in a human-readable format.
 * Mirrors get_today_str() from deep_research_from_scratch/utils.py
 */
export function getTodayStr(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
