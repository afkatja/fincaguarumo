# AGENTS instructions for this repo

## Architectural principles

- Follow the spec → plan → tests → implement → review → simplify → ship flow for new features.
- Treat `./feature-specs/<id>-<slug>.md` as the primary behavioral contract for features.
- Do not introduce new frameworks or major dependencies without an explicit spec update.

## Linear intake

- Treat Linear as the source of incoming work; treat `./feature-specs/<id>-<slug>.md` as the source of truth for implementation.
- For any Linear issue that requires code changes:
  - Fetch the issue details (title, description, acceptance criteria, comments).
  - Create or update a feature spec at `./feature-specs/<linear-key>-<slug>.md`.
  - Preserve the Linear key in the spec filename and frontmatter.

## Branch and PR conventions

- Branch names should follow the Conventional Commits specification and include the Linear key and slug, e.g.:
  - `feat/FG-123-improve-booking-widget`
  - `fix/FG-456-fix-checkout-timeout`
- Commit messages for feature work should:
  - Reference the Linear key in the subject line.
  - Briefly describe the change, e.g. `feat: FG-123: add loading skeleton to booking widget`.
- Pull request titles should start with the Linear key, e.g.:
  - `FG-123: Improve booking widget performance`
- Every PR description should:
  - Link to the Linear issue.
  - Paste or summarize the current feature spec.
  - Include test plan and outcomes (what was run, what passed).

## Linear → spec → workflow

- For Linear issues that require implementation:
  - First: convert the Linear issue into or update `./feature-specs/<key>-<slug>.md`.
  - Then: run the `/feature` workflow (or `@user-story-to-spec`, `@planner`, `@spec-to-tests`, `@implementer`, `@debugger`, `@review`, `@code-simplify`, `@ship`) using that spec as the primary contract.
- Do not start implementation from a Linear issue alone without a corresponding spec file.

## Testing

- Prefer TDD: derive tests from the feature spec before implementation.
- Never delete or weaken tests without clearly documenting why in the spec and commit message.

## Skills and workflows

- For new feature work, prefer:
  - `/feature` workflow
  - `@user-story-to-spec`, `@planner`, `@spec-to-tests`, `@implementer`, `@debugger`, `@review`, `@code-simplify`, `@ship`.
