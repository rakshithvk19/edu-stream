/**
 * Format video duration for display
 */
export function formatVideoDuration(durationSec?: number | null): string {
  if (!durationSec || durationSec <= 0 || !Number.isFinite(durationSec))
    return "--:--";

  // Handle very large durations gracefully
  if (durationSec > 86400) {
    // More than 24 hours
    return `${Math.floor(durationSec / 3600)}h+`;
  }

  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = Math.floor(durationSec % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
