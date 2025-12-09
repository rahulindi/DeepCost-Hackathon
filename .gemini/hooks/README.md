# Kiro Agent Hooks

## Overview
This directory contains automation hooks that enhance the development workflow by triggering actions based on file changes or manual invocation.

## Available Hooks

### Automatic Hooks (Trigger on File Save)

| Hook | Trigger | Action | Status |
|------|---------|--------|--------|
| `lint-on-save` | `*.ts, *.tsx` saved | Run ESLint with auto-fix | ✅ Enabled |
| `type-check` | Frontend TS files saved | Run TypeScript compiler | ✅ Enabled |
| `api-docs-update` | Route files modified | Remind to update docs | ✅ Enabled |
| `security-check` | Backend JS files saved | Security pattern reminder | ✅ Enabled |
| `test-on-save` | Any code file saved | Run related tests | ⏸️ Disabled |
| `component-accessibility` | React components saved | A11y reminder | ⏸️ Disabled |

### Manual Hooks (Trigger on Demand)

| Hook | Action | Use Case |
|------|--------|----------|
| `manual-full-test` | Run complete test suite | Before commits/PRs |
| `manual-build-check` | Verify production build | Before deployment |

## How Hooks Improved Development

### 1. Code Quality Automation
The `lint-on-save` hook automatically fixes formatting issues as you code, eliminating the need for manual linting and ensuring consistent code style across the project.

### 2. Early Error Detection
The `type-check` hook catches TypeScript errors immediately when files are saved, preventing type-related bugs from reaching production.

### 3. Security Awareness
The `security-check` hook serves as a constant reminder to follow security best practices, especially important for a financial application handling AWS credentials.

### 4. Documentation Sync
The `api-docs-update` hook ensures API documentation stays in sync with code changes by prompting developers when route files are modified.

## Configuration

Hooks are configured in `hooks.json`. Each hook has:

```json
{
  "id": "unique-identifier",
  "name": "Human-readable name",
  "description": "What this hook does",
  "trigger": {
    "type": "onFileSave | manual",
    "pattern": "glob pattern for file matching"
  },
  "action": {
    "type": "shellCommand | agentMessage",
    "command": "shell command to run",
    "message": "message to send to agent"
  },
  "enabled": true
}
```

## Enabling/Disabling Hooks

To toggle a hook, change the `enabled` field in `hooks.json`:

```json
{
  "id": "test-on-save",
  "enabled": false  // Change to true to enable
}
```

## Adding New Hooks

1. Add a new entry to the `hooks` array in `hooks.json`
2. Define the trigger type and pattern
3. Specify the action (shell command or agent message)
4. Set `enabled` to `true`

## Best Practices

1. **Keep hooks fast** - Slow hooks disrupt workflow
2. **Use `showOutput: "onError"`** - Only show output when something fails
3. **Disable resource-intensive hooks** - Enable only when needed
4. **Test hooks locally** - Verify commands work before enabling
