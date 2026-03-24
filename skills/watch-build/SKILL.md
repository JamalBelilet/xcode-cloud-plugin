---
name: watch-build
description: Watch a running Xcode Cloud build until it completes. Use when the user has started a build and wants to monitor its progress.
argument-hint: "[build-run-id]"
---

# Watch Xcode Cloud Build

Monitor a running build and report when it completes.

## Arguments

$ARGUMENTS

## Process

### Step 1: Identify the Build

If the user provided a build run ID:
- Use it directly

If no ID provided:
- Call `list_builds` with `limit: 5` to show recent builds
- Look for builds with executionProgress = PENDING or RUNNING
- If multiple are running, ask the user which one to watch

### Step 2: Poll for Status

Repeatedly check the build status:

1. Call `get_build` with the build run ID
2. Report the current state:
   - Which actions are COMPLETE, RUNNING, or PENDING
   - Duration so far
   - Any issues detected early
3. If executionProgress is still PENDING or RUNNING, wait ~30 seconds and check again
4. Repeat until executionProgress = COMPLETE

### Step 3: Final Report

Once the build completes:

1. Call `get_build` one final time to get the complete picture
2. Report:
   - **Final status**: SUCCEEDED, FAILED, ERRORED, or CANCELED
   - **Total duration**: from startedDate to finishedDate
   - **Action results**: status of each action (BUILD, TEST, ANALYZE, ARCHIVE)
3. If the build failed:
   - Call `get_build_issues` on failed actions
   - Call `get_test_results` on failed test actions
   - Present a summary of what went wrong
4. If the build succeeded:
   - Call `get_build_artifacts` to list available outputs
   - Present a success summary with artifact info

## Tips

- Don't poll too frequently — 30-second intervals are respectful of API rate limits
- Show incremental progress (e.g., "Build action completed, Test action starting...")
- If a build has been running for an unusually long time (>30 min), mention it
