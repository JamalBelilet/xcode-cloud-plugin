import type { CiBuildRun, CiIssueCounts } from "../api/types.js";

export function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return "—";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatBuildStatus(run: CiBuildRun): string {
  const status =
    run.executionProgress === "COMPLETE"
      ? (run.completionStatus ?? "UNKNOWN")
      : run.executionProgress;

  const duration =
    run.startedDate && run.finishedDate
      ? ` (${formatDuration(run.startedDate, run.finishedDate)})`
      : run.startedDate
        ? " (running)"
        : "";

  return `Build #${run.number} — ${status}${duration}`;
}

export function formatIssueCounts(counts: CiIssueCounts): string {
  const parts: string[] = [];
  if (counts.errors > 0) parts.push(`${counts.errors} error${counts.errors > 1 ? "s" : ""}`);
  if (counts.testFailures > 0)
    parts.push(`${counts.testFailures} test failure${counts.testFailures > 1 ? "s" : ""}`);
  if (counts.warnings > 0)
    parts.push(`${counts.warnings} warning${counts.warnings > 1 ? "s" : ""}`);
  if (counts.analyzerWarnings > 0)
    parts.push(`${counts.analyzerWarnings} analyzer warning${counts.analyzerWarnings > 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(", ") : "no issues";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
