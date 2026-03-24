---
name: compare-builds
description: Compare two Xcode Cloud builds side by side. Use when asked to diff builds, understand what changed between builds, or investigate regressions.
argument-hint: "<build-id-1> <build-id-2>"
---

# Compare Xcode Cloud Builds

Side-by-side comparison of two build runs to identify what changed.

## Arguments

$ARGUMENTS

## Process

### Step 1: Identify the Builds

If two build IDs are provided:
- Use them directly

If fewer than two IDs provided:
- Call `list_builds` to show recent builds
- Ask the user which two builds to compare (suggest the last succeeded and last failed)

### Step 2: Fetch Build Details

For each build, call `get_build` to retrieve:
- Build number, status, duration
- Source commit info (SHA, author, message)
- All actions and their statuses
- Issue counts

### Step 3: Compare Actions

For each action type (BUILD, TEST, ANALYZE, ARCHIVE), compare:
- **Status**: Did it pass in one but fail in the other?
- **Duration**: How much faster/slower was each action?
- **Issue counts**: More/fewer errors, warnings, test failures?

### Step 4: Compare Issues (if applicable)

If either build has failures:
- Call `get_build_issues` on failed actions in both builds
- Show new issues (present in build B but not in build A)
- Show resolved issues (present in build A but not in build B)

### Step 5: Compare Test Results (if applicable)

If test actions exist in both builds:
- Call `get_test_results` on both
- Identify: newly failing tests, newly passing tests, consistently failing tests
- Report flaky tests (passed in one, failed in the other)

### Step 6: Present Comparison

Format as:

**Build #{A} vs Build #{B}**

| Metric | Build #{A} | Build #{B} | Delta |
|--------|-----------|-----------|-------|
| Status | ... | ... | |
| Duration | ... | ... | +/-Xm Xs |
| Errors | ... | ... | +/-N |
| Test Failures | ... | ... | +/-N |

Then:
- **Commit Diff**: What changed between the two commits
- **New Issues**: Issues in B not in A
- **Resolved Issues**: Issues in A not in B
- **Test Regressions**: Tests that started failing
- **Test Fixes**: Tests that started passing
