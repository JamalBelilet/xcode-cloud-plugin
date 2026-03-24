# Xcode Cloud Plugin for Claude Code

Monitor builds, diagnose failures, trigger workflows, and manage your Apple Xcode Cloud CI/CD pipeline directly from Claude Code.

## Overview

This plugin bridges Claude Code to Apple's App Store Connect API, giving you full access to Xcode Cloud from your terminal. Instead of switching between Xcode, the App Store Connect web portal, and your CLI, you can manage your entire CI/CD pipeline through natural language.

The plugin provides 21 MCP tools across 6 API categories, 7 skills for guided workflows, and 3 specialized agents for deep analysis. Most operations are read-only by default. State-changing operations (starting builds, modifying workflows) require explicit user confirmation through safety hooks.

## Features

- **21 MCP tools** across 6 categories for full Xcode Cloud API coverage
- **7 skills** for guided workflows — setup, build triggering, monitoring, diagnostics, analysis, and comparison
- **3 specialized agents** for deep analysis — build failures, pipeline optimization, flaky test detection
- **Safety hooks** requiring confirmation before destructive operations
- **Smart error handling** with actionable messages for auth, permissions, and API errors
- **CI-friendly** configuration supporting both file-based and inline private keys

## Prerequisites

- [Claude Code](https://claude.com/claude-code) v1.0.33+
- Node.js >= 20.0.0
- Apple Developer account with App Store Connect access
- App Store Connect API key (Developer role or higher)
- Xcode Cloud enabled for at least one product

## Installation

```shell
/plugin marketplace add JamalBelilet/xcode-cloud-plugin
/plugin install xcode-cloud@jamalbelilet-xcode-cloud
```

## Setup

### Quick setup

Run `/xcode-cloud:setup` — the skill walks you through credential configuration and verifies the connection.

### Manual configuration

You need three values from [App Store Connect > Users and Access > Integrations > API](https://appstoreconnect.apple.com/access/integrations/api):

1. **Issuer ID** — shown at the top of the API keys page
2. **Key ID** — the identifier for an API key with Developer role
3. **Private Key (.p8 file)** — downloaded when the key was created

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export APPLE_ISSUER_ID="your-issuer-id"
export APPLE_KEY_ID="your-key-id"
export APPLE_PRIVATE_KEY_PATH="/path/to/AuthKey.p8"
```

For CI environments, pass the key inline instead (literal `\n` is auto-normalized):

```bash
export APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGH...\n-----END PRIVATE KEY-----"
```

### Verify

After configuring, ask Claude: "List my Xcode Cloud products" — if credentials are valid, you'll see your apps.

## Usage

Just ask Claude about your builds in natural language. Here are some examples grouped by task:

**Checking build status**
- "Show me my recent Xcode Cloud builds"
- "What's the status of my latest build?"
- "Are there any failed builds?"

**Diagnosing failures**
- "Why did my last build fail?"
- "What errors are in build #47?"
- "Show me the test failures from the latest build"

**Triggering and managing builds**
- "Start a build on the develop branch"
- "Retry the last failed build"
- "Watch my running build until it finishes"

**Pipeline analysis**
- "How healthy is my CI pipeline?"
- "Compare the last passing build to the last failure"
- "Are there any flaky tests in my project?"

**Environment and configuration**
- "What Xcode versions are available?"
- "List my connected repositories"
- "Show me all my workflows"

## Skills

### `/xcode-cloud:setup` (user-invoked)

Configure Apple App Store Connect API credentials.

**Usage:**
```
/xcode-cloud:setup
```

Walks through creating an API key if needed, sets environment variables, and verifies the connection by calling the API.

### `/xcode-cloud:trigger-build` (user-invoked)

Start a new Xcode Cloud build for a workflow.

**Usage:**
```
/xcode-cloud:trigger-build [workflow-name] [--branch <name>] [--clean]
```

Discovers available workflows, resolves branches, and starts the build. If no workflow name is given, lists available workflows to choose from.

### `check-builds` (model-invoked)

Claude automatically uses this when you ask about build status, CI status, or pipeline health. Lists recent builds, drills into failures, and shows issues and test results.

**Triggers:**
```
"What's my build status?"
"Show me recent builds"
"Did my last build pass?"
```

### `diagnose-failure` (model-invoked)

Claude automatically uses this when you ask why a build failed or to debug CI errors. Runs a systematic 6-step diagnosis: build overview, failed actions, issues, test results, artifacts, and fix recommendations.

**Triggers:**
```
"Why did my last build fail?"
"Debug the CI error in build #42"
"What went wrong with today's build?"
```

### `analyze-builds` (model-invoked)

Claude automatically uses this when you ask about CI health, success rates, or build trends. Computes metrics across workflows including success rate, average duration, and failure breakdown. Flags workflows below 80% success rate.

**Triggers:**
```
"How healthy is my CI pipeline?"
"What's my build success rate?"
"Show me CI trends"
```

### `compare-builds` (model-invoked)

Claude automatically uses this when you ask to diff two builds or investigate regressions. Compares actions, issues, and test results side by side with a delta summary.

**Usage:**
```
"Compare build A to build B"
"What changed between the passing and failing build?"
```

### `watch-build` (model-invoked)

Claude automatically uses this to monitor a running build. Polls at ~30-second intervals with incremental progress updates and provides a final summary with artifacts or failure details when complete.

**Triggers:**
```
"Watch my running build"
"Monitor the build until it finishes"
```

## Agents

### `build-failure-analyst`

**Purpose**: Deep root-cause analysis of Xcode Cloud build failures.

**Focus areas:**
- Swift/ObjC compilation and linking errors
- Xcode build system and workspace configuration
- XCTest and Swift Testing failures
- Code signing and provisioning
- App Store Connect CI infrastructure issues

**When triggered**: When a failure needs more than surface-level diagnosis — complex multi-action failures, obscure errors, or repeated issues.

**Output format:**
- Summary of failure
- Failed actions with details
- Root cause analysis
- Affected files
- Recommended fix
- Additional notes

**Example triggers:**
```
"Do a deep analysis of why build #42 failed"
"Analyze the root cause of the signing error"
```

### `ci-pipeline-advisor`

**Purpose**: Pipeline configuration and build history analysis for optimization.

**Focus areas:**
- Workflow configuration review
- Success/failure rate patterns
- Build duration analysis
- Xcode version strategy
- Flaky test detection

**When triggered**: When asking for pipeline-level improvements rather than single-build diagnosis.

**Output format:**
- Pipeline overview
- Build health report
- Identified issues
- Prioritized recommendations

**Example triggers:**
```
"How can I improve my CI pipeline?"
"Give me recommendations for my workflows"
```

### `flaky-test-detector`

**Purpose**: Identifies intermittently failing tests across builds.

**Focus areas:**
- Test pass/fail patterns across 30+ builds
- Platform-specific failures
- Flakiness scoring
- Pipeline reliability impact

**When triggered**: When investigating test flakiness or unexplained intermittent failures.

**Output format:**
- Flaky test report with critical/non-critical tables
- Per-test failure rate and pattern
- Estimated pipeline failure percentage caused by flakiness
- Remediation recommendations

**Example triggers:**
```
"Are there any flaky tests in my project?"
"Which tests are failing intermittently?"
```

## MCP Tools Reference

### Products (2)

| Tool | Description |
|------|-------------|
| `list_ci_products` | List all CI products (apps/frameworks) in your account |
| `get_ci_product` | Get product details with linked repositories |

### Workflows (4)

| Tool | Description |
|------|-------------|
| `list_workflows` | List workflows, optionally scoped to a product |
| `get_workflow` | Get full workflow configuration details |
| `update_workflow` | Update workflow name, description, or enabled state |
| `delete_workflow` | Delete a workflow and all its build data (irreversible) |

### Builds (4)

| Tool | Description |
|------|-------------|
| `list_builds` | List recent builds, filterable by product, workflow, or status |
| `get_build` | Get detailed build status with actions, issues, and commit info |
| `start_build` | Start a new build run for a workflow |
| `retry_build` | Retry a failed or errored build |

### Results & Artifacts (5)

| Tool | Description |
|------|-------------|
| `get_build_issues` | Get errors, warnings, and analyzer findings from a build action |
| `get_test_results` | Get test pass/fail results from a test action |
| `get_build_artifacts` | List downloadable artifacts (logs, archives, test bundles) |
| `get_artifact` | Get details and download URL for a specific artifact |
| `get_issue` | Get details of a specific build issue |

### Environment (2)

| Tool | Description |
|------|-------------|
| `list_xcode_versions` | List available Xcode versions with compatible macOS versions |
| `list_macos_versions` | List available macOS versions for builds |

### Source Control (4)

| Tool | Description |
|------|-------------|
| `list_scm_providers` | List connected SCM providers (GitHub, Bitbucket, GitLab) |
| `list_scm_repositories` | List all repositories connected to Xcode Cloud |
| `get_scm_repository` | Get details of a specific repository |
| `list_git_references` | List branches and tags for a repository |

## Safety Hooks

State-changing operations require user confirmation before executing:

| Operation | Confirmation |
|-----------|-------------|
| `start_build` | Claude describes what will be built and asks for confirmation |
| `retry_build` | Claude confirms which build will be retried |
| `update_workflow` | Claude describes the changes and asks for confirmation |
| `delete_workflow` | Claude warns this is irreversible and asks for explicit confirmation |

Read-only operations (listing, getting, querying) execute without confirmation.

## Best Practices

- **Start with setup**: Run `/xcode-cloud:setup` first to validate credentials
- **Use natural language**: You rarely need to reference tool names — just describe what you want
- **Scope your queries**: Specify product or workflow names when you have multiple to avoid ambiguity
- **Build on results**: Ask follow-up questions — Claude maintains context (e.g., "Now show me the test failures from that build")
- **Use agents for deep analysis**: For complex failures, Claude may spawn a specialized agent automatically
- **Monitor long builds**: Use "watch my build" to get progress updates without manually checking
- **Keep keys secure**: Never commit `.p8` files to version control; use environment variables

## Troubleshooting

### Missing environment variables

**Issue**: `APPLE_ISSUER_ID environment variable is required`

**Solution**: Environment variables are not set. Add them to your shell profile and restart your terminal, or run `/xcode-cloud:setup`.

### Bad key path

**Issue**: `Cannot read private key at /path/to/key.p8`

**Solution**: The path in `APPLE_PRIVATE_KEY_PATH` is wrong or the file doesn't exist. Verify the absolute path to your `.p8` file.

### Invalid key format

**Issue**: `Invalid private key format`

**Solution**: The `.p8` file is corrupted or not a valid PKCS#8 PEM key. If using `APPLE_PRIVATE_KEY` inline, ensure newlines are escaped as `\n`.

### 401 Unauthorized

**Issue**: API requests return 401

**Solution**: API key may be expired or credentials are wrong. Regenerate the key in App Store Connect and run `/xcode-cloud:setup`.

### 403 Forbidden

**Issue**: API requests return 403

**Solution**: API key lacks sufficient permissions. The key needs at least Developer role in App Store Connect.

### 404 Not Found

**Issue**: Resource not found

**Solution**: The resource ID is incorrect or the resource was deleted. Use `list_*` tools to find valid IDs.

### Plugin fails to start

**Issue**: No tools appear after installation

**Solution**: Ensure Node.js 20+ is installed (`node --version`). The MCP server requires Node.js to run.

---

**Author**: Jamal Belilet
**Version**: 1.0.0
**License**: MIT
**Category**: External Integrations
**Repository**: [github.com/JamalBelilet/xcode-cloud-plugin](https://github.com/JamalBelilet/xcode-cloud-plugin)
