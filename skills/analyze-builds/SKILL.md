---
name: analyze-builds
description: Analyze Xcode Cloud build health and trends. Use when asked about CI health, build success rates, build duration trends, or failure patterns.
---

# Analyze Xcode Cloud Build Trends

Compute build health metrics and identify trends across recent build history.

## Process

### Step 1: Gather Build Data

1. Call `list_ci_products` to identify the target product (ask the user if multiple exist).
2. Call `list_workflows` with the product ID to get all workflows.
3. For each active workflow, call `list_builds` with `limit: 50` to get recent build history.

### Step 2: Compute Metrics

For each workflow, calculate:
- **Success rate**: percentage of builds with completionStatus = SUCCEEDED
- **Average duration**: mean time from startedDate to finishedDate for completed builds
- **Failure frequency**: how many builds failed per day/week
- **Failure breakdown**: count by completionStatus (FAILED, ERRORED, CANCELED)
- **Trigger mix**: count by startReason (MANUAL, GIT_REF_CHANGE, PULL_REQUEST_OPEN, SCHEDULE, etc.)
- **PR build health**: success rate specifically for isPullRequestBuild = true builds

### Step 3: Identify Trends

Look for patterns:
- Is the success rate improving or degrading over the last 20 builds vs. the previous 20?
- Are build durations increasing (regression in build performance)?
- Are there specific days/times with more failures?
- Are certain start reasons more likely to fail (e.g., scheduled builds)?

### Step 4: Deep-Dive Failures

For the most common failure types:
- Call `get_build` on 2-3 representative failed builds
- Call `get_build_issues` on failed actions to categorize errors
- Group failures by category: compilation, testing, signing, infrastructure

### Step 5: Present Report

Format as a health dashboard:

**CI Health Dashboard — {product name}**

| Workflow | Success Rate | Avg Duration | Last 10 | Trend |
|----------|-------------|--------------|---------|-------|

Then provide:
- **Top Issues**: Most frequent failure categories with counts
- **Recommendations**: Actionable improvements based on the data
- **Flaky Signals**: Any builds that failed then succeeded on retry (same commit)

## Tips

- Use formatDuration-style presentation for durations (e.g., "4m 32s")
- Flag any workflow with success rate below 80% as needing attention
- If a workflow hasn't had a build in 30+ days, note it as potentially stale
