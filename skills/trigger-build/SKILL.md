---
name: trigger-build
description: Trigger a new Xcode Cloud build for a workflow
argument-hint: "[workflow-name] [--branch <name>] [--clean]"
---

# Trigger Xcode Cloud Build

Start a new Xcode Cloud build run.

## Arguments

$ARGUMENTS

## Process

### Step 1: Identify the Workflow

If the user specified a workflow name or ID:
- If it looks like an ID (UUID format), use it directly
- If it's a name, call `list_ci_products` then `list_workflows` to find the matching workflow

If no workflow specified:
- Call `list_ci_products` to show products
- Ask which product, then call `list_workflows` to show workflows
- Ask which workflow to trigger

### Step 2: Determine Git Reference

If the user specified `--branch`:
- Call `get_ci_product` to get the repository ID
- Call `list_git_references` with the repository ID
- Find the matching branch or tag
- Use its ID as the gitReferenceId

If no branch specified:
- The build will use the workflow's default branch

### Step 3: Start the Build

Call `start_build` with:
- `workflowId`: the identified workflow ID
- `gitReferenceId`: (optional) the branch/tag reference ID
- `clean`: true if user specified `--clean`

### Step 4: Confirm

After the build starts:
- Show the build run ID and initial status
- Tell the user they can check progress by asking about build status
