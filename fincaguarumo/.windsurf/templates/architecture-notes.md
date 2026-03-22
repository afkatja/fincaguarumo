# Architecture Notes: <Feature name>

## 1. Context

- Existing system area:
- Relevant modules / packages:
- Existing patterns to follow (state mgmt, API layer, UI patterns):

## 2. Design decision summary

- Main design choice:
- Alternatives considered:
- Why we chose this option (tradeoffs):

## 3. Constraints & invariants

- Must not:
  - (e.g., bypass existing auth middleware)
- Must:
  - (e.g., log all failures using `logger.error` with `feature=<name>` tag)
- Performance / scaling constraints:
- Data consistency or transactional constraints:

## 4. Integration points

- Upstream dependencies:
- Downstream dependencies (who calls this):
- External services / APIs:
- Feature flags / config keys:

## 5. Implementation notes for agents

- Preferred files / folders to extend:
- Files to avoid touching:
- Reusable helpers / components to prefer:
- Tech choices that are locked in (frameworks, libs, patterns):

## 6. Follow‑up ADR (optional)

If this decision is significant, create `adr-<id>-<slug>.md` using the project ADR template and link it here.
