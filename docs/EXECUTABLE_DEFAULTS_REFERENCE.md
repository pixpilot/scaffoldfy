# Executable Default Values - Quick Reference

This document provides quick examples of executable default values for common use cases.

## Table of Contents

- [Git Information](#git-information)
- [Node.js & Package Managers](#nodejs--package-managers)
- [Environment Detection](#environment-detection)
- [System Information](#system-information)
- [File System Checks](#file-system-checks)
- [Cross-Platform Commands](#cross-platform-commands)

## Git Information

### Current Branch

```json
{
  "type": "execute",
  "value": "git branch --show-current"
}
```

### Remote URL

```json
{
  "type": "execute",
  "value": "git config --get remote.origin.url"
}
```

### User Name

```json
{
  "type": "execute",
  "value": "git config user.name"
}
```

### User Email

```json
{
  "type": "execute",
  "value": "git config user.email"
}
```

### Default Branch Name

```json
{
  "type": "execute",
  "value": "git config init.defaultBranch || echo 'main'"
}
```

### Check if Git Repository Exists

```json
{
  "type": "execute",
  "value": "test -d .git && echo 'true' || echo 'false'"
}
```

## Node.js & Package Managers

### Node.js Version

```json
{
  "type": "execute",
  "value": "node --version"
}
```

### npm Version

```json
{
  "type": "execute",
  "value": "npm --version"
}
```

### Detect Available Package Manager (Unix/macOS)

```json
{
  "type": "execute",
  "value": "command -v pnpm > /dev/null && echo 'pnpm' || (command -v yarn > /dev/null && echo 'yarn' || echo 'npm')"
}
```

### Detect Available Package Manager (Cross-platform using Node.js)

```json
{
  "type": "execute",
  "value": "node -e \"try { require.resolve('pnpm'); console.log('pnpm'); } catch { try { require.resolve('yarn'); console.log('yarn'); } catch { console.log('npm'); } }\""
}
```

### Get Current Package Name from package.json

```json
{
  "type": "execute",
  "value": "node -p \"require('./package.json').name\""
}
```

## Environment Detection

### Check if Running in CI

```json
{
  "type": "execute",
  "value": "test -n \"$CI\" && echo 'true' || echo 'false'"
}
```

### Get Environment Variable

```json
{
  "type": "execute",
  "value": "node -p \"process.env.MY_VAR || 'default-value'\""
}
```

### Operating System (Cross-platform)

```json
{
  "type": "execute",
  "value": "node -p \"process.platform\""
}
```

## System Information

### Current Directory Name (Cross-platform)

```json
{
  "type": "execute",
  "value": "node -p \"require('path').basename(process.cwd())\""
}
```

### Home Directory (Cross-platform)

```json
{
  "type": "execute",
  "value": "node -p \"require('os').homedir()\""
}
```

### Username (Cross-platform)

```json
{
  "type": "execute",
  "value": "node -p \"require('os').userInfo().username\""
}
```

### CPU Count

```json
{
  "type": "execute",
  "value": "node -p \"require('os').cpus().length\""
}
```

## File System Checks

### Check if Directory Exists (Unix/macOS)

```json
{
  "type": "execute",
  "value": "test -d src && echo 'true' || echo 'false'"
}
```

### Check if File Exists (Unix/macOS)

```json
{
  "type": "execute",
  "value": "test -f package.json && echo 'true' || echo 'false'"
}
```

### Check if Directory Exists (Cross-platform)

```json
{
  "type": "execute",
  "value": "node -e \"console.log(require('fs').existsSync('src'))\""
}
```

### Count Files in Directory (Unix/macOS)

```json
{
  "type": "execute",
  "value": "ls -1 | wc -l"
}
```

## Cross-Platform Commands

For maximum compatibility across Windows, macOS, and Linux, use Node.js commands:

### Current Working Directory

```json
{
  "type": "execute",
  "value": "node -p \"process.cwd()\""
}
```

### Timestamp

```json
{
  "type": "execute",
  "value": "node -p \"Date.now()\""
}
```

### Current Date (ISO format)

```json
{
  "type": "execute",
  "value": "node -p \"new Date().toISOString()\""
}
```

### Current Year

```json
{
  "type": "execute",
  "value": "node -p \"new Date().getFullYear()\""
}
```

### Random UUID

```json
{
  "type": "execute",
  "value": "node -p \"require('crypto').randomUUID()\""
}
```

## Tips

1. **Use Node.js for cross-platform compatibility**: Node.js is guaranteed to be available since it's required to run the tool
2. **Keep commands simple**: Complex commands are harder to debug and may fail
3. **Provide fallbacks**: Use `||` to provide fallback values if commands fail
4. **Test on multiple platforms**: Windows, macOS, and Linux may behave differently
5. **Use JSON output when possible**: Commands that output JSON are automatically parsed
6. **Remember the 10-second timeout**: Commands must complete within 10 seconds

