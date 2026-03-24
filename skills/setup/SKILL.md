---
name: setup
description: Set up Apple App Store Connect API credentials for Xcode Cloud
---

# Xcode Cloud Plugin Setup

Help the user configure their Apple App Store Connect API credentials.

## Prerequisites Check

First, verify Node.js >= 20 is installed by running `node --version`. If not installed or below v20, tell the user to install Node.js 20+ before proceeding.

## Setup Process

### Step 1: Explain Requirements

The user needs three things from App Store Connect:

1. **Issuer ID** — Found at https://appstoreconnect.apple.com/access/integrations/api under "Issuer ID" at the top of the page
2. **Key ID** — The identifier for an API key with at least "Developer" role
3. **Private Key (.p8 file)** — Downloaded when the key was created (only downloadable once)

If they don't have an API key yet, walk them through creating one:
1. Go to https://appstoreconnect.apple.com/access/integrations/api
2. Click "Generate API Key" (or the "+" button)
3. Name it "Claude Code Xcode Cloud"
4. Select "Developer" role (minimum needed for CI/CD operations)
5. Download the .p8 file and store it securely

### Step 2: Configure Environment Variables

Tell the user to add these to their shell profile (`~/.zshrc`, `~/.bashrc`, or `~/.zprofile`):

```bash
export APPLE_ISSUER_ID="their-issuer-id"
export APPLE_KEY_ID="their-key-id"
export APPLE_PRIVATE_KEY_PATH="/path/to/AuthKey_XXXXXXXX.p8"
```

Alternatively, for CI environments or inline key usage:
```bash
export APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Remind the user to restart their terminal or run `source ~/.zshrc` after editing.

### Step 3: Verify Connection

After the user confirms the variables are set, call `list_ci_products` to verify the connection works.

- **Success**: Show the products list and confirm setup is complete.
- **Failure diagnostics**:
  - Missing env var error → variable not set, check shell profile
  - 401 Unauthorized → wrong credentials or expired key
  - 403 Forbidden → key doesn't have sufficient permissions (needs Developer role)

## Security Reminders

- Never commit the .p8 file to version control
- Store it outside the project directory
- Use environment variables, not hardcoded paths
- Rotate keys periodically
