import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatFileSize,
  formatBuildStatus,
  formatIssueCounts,
  formatDate,
} from "../../src/util/formatting.js";

describe("formatDuration", () => {
  it("formats seconds", () => {
    expect(formatDuration("2025-01-01T00:00:00Z", "2025-01-01T00:00:45Z")).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration("2025-01-01T00:00:00Z", "2025-01-01T00:03:15Z")).toBe("3m 15s");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration("2025-01-01T00:00:00Z", "2025-01-01T02:30:00Z")).toBe("2h 30m");
  });

  it("returns dash for negative duration", () => {
    expect(formatDuration("2025-01-01T01:00:00Z", "2025-01-01T00:00:00Z")).toBe("\u2014");
  });

  it("formats zero duration", () => {
    expect(formatDuration("2025-01-01T00:00:00Z", "2025-01-01T00:00:00Z")).toBe("0s");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(5242880)).toBe("5.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(2147483648)).toBe("2.0 GB");
  });

  it("formats zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });
});

describe("formatBuildStatus", () => {
  it("formats completed and succeeded build", () => {
    const result = formatBuildStatus({
      id: "b-1",
      number: 42,
      createdDate: "2025-01-01T00:00:00Z",
      startedDate: "2025-01-01T00:01:00Z",
      finishedDate: "2025-01-01T00:05:30Z",
      executionProgress: "COMPLETE",
      completionStatus: "SUCCEEDED",
      startReason: "MANUAL",
      isPullRequestBuild: false,
    });
    expect(result).toContain("Build #42");
    expect(result).toContain("SUCCEEDED");
    expect(result).toContain("4m 30s");
  });

  it("formats running build", () => {
    const result = formatBuildStatus({
      id: "b-1",
      number: 10,
      createdDate: "2025-01-01T00:00:00Z",
      startedDate: "2025-01-01T00:01:00Z",
      executionProgress: "RUNNING",
      startReason: "GIT_REF_CHANGE",
      isPullRequestBuild: false,
    });
    expect(result).toContain("Build #10");
    expect(result).toContain("RUNNING");
    expect(result).toContain("(running)");
  });

  it("formats pending build", () => {
    const result = formatBuildStatus({
      id: "b-1",
      number: 5,
      createdDate: "2025-01-01T00:00:00Z",
      executionProgress: "PENDING",
      startReason: "SCHEDULE",
      isPullRequestBuild: false,
    });
    expect(result).toContain("Build #5");
    expect(result).toContain("PENDING");
    expect(result).not.toContain("(running)");
  });

  it("formats complete build with no completionStatus", () => {
    const result = formatBuildStatus({
      id: "b-1",
      number: 7,
      createdDate: "2025-01-01T00:00:00Z",
      executionProgress: "COMPLETE",
      startReason: "MANUAL",
      isPullRequestBuild: false,
    });
    expect(result).toContain("UNKNOWN");
  });
});

describe("formatIssueCounts", () => {
  it("formats errors only", () => {
    const result = formatIssueCounts({
      errors: 3,
      testFailures: 0,
      warnings: 0,
      analyzerWarnings: 0,
    });
    expect(result).toBe("3 errors");
  });

  it("formats mixed counts", () => {
    const result = formatIssueCounts({
      errors: 1,
      testFailures: 2,
      warnings: 5,
      analyzerWarnings: 1,
    });
    expect(result).toContain("1 error");
    expect(result).toContain("2 test failures");
    expect(result).toContain("5 warnings");
    expect(result).toContain("1 analyzer warning");
  });

  it("returns no issues when all zero", () => {
    const result = formatIssueCounts({
      errors: 0,
      testFailures: 0,
      warnings: 0,
      analyzerWarnings: 0,
    });
    expect(result).toBe("no issues");
  });

  it("formats singular counts", () => {
    const result = formatIssueCounts({
      errors: 1,
      testFailures: 1,
      warnings: 1,
      analyzerWarnings: 1,
    });
    expect(result).toContain("1 error,");
    expect(result).toContain("1 test failure,");
    expect(result).toContain("1 warning,");
    expect(result).toContain("1 analyzer warning");
  });
});

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatDate("2025-01-15T10:30:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });

  it("formats a different date", () => {
    const result = formatDate("2025-12-25T18:00:00Z");
    expect(result).toContain("Dec");
    expect(result).toContain("25");
  });
});
