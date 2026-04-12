---
description: Run tsc --noEmit type checking on pull requests to main branch
---

# TSC Type Check Workflow

This workflow runs `tsc --noEmit` to perform type checking on pull requests targeting the main branch.

## When to use

Use this workflow when:

- Creating a pull request that targets the main branch
- You want to ensure TypeScript compilation without emitting files
- You need to catch type errors before merging

## Steps

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run tsc type checking**
   ```bash
   npx tsc --noEmit
   ```

## Notes

- The `--noEmit` flag performs type checking without generating output files
- This ensures all TypeScript files are properly typed
- The command will exit with an error code if type checking fails
- This should be run as part of CI/CD pipeline for pull requests targeting main

## Integration with Git Hooks

This workflow can be integrated with pre-commit hooks or CI/CD pipelines to automatically run type checking before allowing merges to the main branch.
