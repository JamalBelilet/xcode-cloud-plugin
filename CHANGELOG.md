# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-03-24

### Added

- MCP server with 21 tools across 6 categories: Products, Workflows, Builds, Results & Artifacts, Environment, Source Control
- 7 skills: setup, check-builds, trigger-build, diagnose-failure, analyze-builds, compare-builds, watch-build
- 3 specialized agents: build-failure-analyst, ci-pipeline-advisor, flaky-test-detector
- Safety hooks requiring confirmation before destructive operations (start_build, retry_build, update_workflow, delete_workflow)
- Smart error handling with actionable messages for auth, permissions, and API errors
- Support for both file-based and inline private keys for CI environments
