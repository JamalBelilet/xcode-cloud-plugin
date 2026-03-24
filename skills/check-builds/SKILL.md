---
name: check-builds
description: Check Xcode Cloud CI build status. Use when asked about builds, CI status, build failures, or pipeline health for iOS/macOS apps.
---

# Check Xcode Cloud Builds

Guide Claude through checking Xcode Cloud build status efficiently.

## Process

1. **Identify the product**: If the user hasn't specified which product, call `list_ci_products` first to show available CI products and ask which one.

2. **List recent builds**: Use `list_builds` with the product ID to show recent build runs. Show the last 10 by default.

3. **Drill into failures**: If any builds show FAILED or ERRORED status:
   - Call `get_build` with the build run ID to get detailed action information
   - For each failed action, call `get_build_issues` to retrieve specific errors
   - For test actions that failed, call `get_test_results` to show which tests failed

4. **Present results clearly**: Format the output as a summary table followed by details on any failures.

## Tool Chain

The typical sequence is:
1. `list_ci_products` → get product ID
2. `list_builds` (with productId) → get build run IDs
3. `get_build` (with buildRunId) → get action IDs for failed builds
4. `get_build_issues` or `get_test_results` (with buildActionId) → get failure details

## Tips

- Build actions have types: BUILD, ANALYZE, TEST, ARCHIVE. Focus on failed ones.
- Issue types are: ERROR, WARNING, ANALYZER_WARNING, TEST_FAILURE
- The `issueCounts` on a build run gives a quick summary without fetching all issues
- If showing many builds, group by workflow for clarity
