---
name: diagnose-failure
description: Diagnose Xcode Cloud build failures. Use when asked why a build failed, to debug CI errors, or to analyze test failures.
---

# Diagnose Xcode Cloud Build Failure

Systematic approach to diagnosing why an Xcode Cloud build failed.

## Diagnosis Process

### Step 1: Get Build Overview
Call `get_build` with the build run ID to see:
- Overall completion status (FAILED, ERRORED, CANCELED)
- Which actions failed (BUILD, TEST, ANALYZE, ARCHIVE)
- Issue counts summary
- Source commit information

### Step 2: Identify Failed Actions
From the build details, find actions with `completionStatus` of FAILED or ERRORED. Prioritize in this order:
1. BUILD actions (compilation failures block everything)
2. TEST actions (test failures)
3. ANALYZE actions (static analysis issues)
4. ARCHIVE actions (signing/packaging problems)

### Step 3: Retrieve Issues
For each failed action, call `get_build_issues` to get specific error messages. Key information:
- `issueType`: ERROR, WARNING, TEST_FAILURE, ANALYZER_WARNING
- `message`: The actual error text
- `fileSource.path` and `fileSource.lineNumber`: Where the error occurred

### Step 4: For Test Failures
If the failure involves tests, call `get_test_results` to see:
- Which specific test cases failed
- The failure messages
- Which devices/OS versions were affected

### Step 5: Check Build Artifacts
Call `get_build_artifacts` to see if logs are available for download. Build logs contain the full Xcode output.

### Step 6: Analyze and Recommend
Based on the collected information:
- Identify the root cause (compilation error, test regression, signing issue, etc.)
- If the user's codebase is available, look at the referenced files and line numbers
- Suggest specific fixes
- If the error is transient (network, infrastructure), suggest retrying with `retry_build`

## Common Failure Patterns

- **Compilation errors**: Missing imports, type mismatches, deprecated API usage
- **Test failures**: Flaky tests, environment-dependent failures, timing issues
- **Signing errors**: Expired certificates, missing provisioning profiles
- **Archive failures**: Build settings misconfiguration, missing entitlements
- **Infrastructure errors**: Xcode version incompatibility, resource limits
