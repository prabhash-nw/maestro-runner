## Plan: Go Lint Cleanup In Progressive Commits

Create a dedicated branch and fix Go lint findings in strict easy-to-hard order, committing after each stable bucket so risk stays isolated and bisectable. Start with low-risk mechanical fixes (`errcheck` in tests/helpers, targeted `staticcheck` deprecation hot spots), then move into semantic safety fixes (`nilaway`), then security-hardening (`gosec`), and finally toolchain patch upgrade for `govulncheck` standard-library advisories.

**Steps**
1. Create branch `chore/go-lint-fixes` from current `main` and capture baseline diagnostics for all failing Go lint targets. This establishes exact pre-fix counts and prevents chasing stale output.
2. Phase 1 (easy, mechanical): fix low-risk unchecked-error cases first in tests and simple helper code (close/write/unmarshal returns), re-run `errcheck`, and commit. This phase should avoid behavior changes.
3. Phase 2 (easy-medium): address `staticcheck` SA1019 deprecation warnings for websocket usage by migrating imports/usages to maintained equivalents where straightforward, re-run `staticcheck`, and commit. If a warning is external/non-actionable, isolate and document.
4. Phase 3 (medium): resolve `nilaway` reports with explicit guards and safer control flow in high-signal call chains, re-run `nilaway`, and commit. Keep each fix localized per package to reduce regression risk.
5. Phase 4 (medium-hard): remediate `gosec` findings, prioritizing command execution paths by input trust level. Add strict validation/sanitization for dynamic command args (UDID, bundle ID, serial), re-run `gosec`, and commit.
6. Phase 5 (toolchain/security): bump Go patch/toolchain to a version that includes stdlib vuln fixes reported by `govulncheck`, run module cleanup if required, re-run `govulncheck`, and commit.
7. Final verification gate (depends on 2-6): run full Go lint matrix in one pass and ensure all targeted checks pass before finishing.
8. Produce a concise commit log and per-phase outcome summary (what changed, what was fixed, what remains intentionally deferred).

**Parallelization and dependencies**
1. Steps 2 and 3 can partly overlap by package ownership, but merge only after each linter is green for that phase.
2. Step 4 should wait for Step 3 where files overlap in driver/simulator command paths.
3. Step 6 should happen after code fixes, because toolchain changes can alter analyzer output and should be isolated in its own commit.

**Commit strategy**
1. `chore(lint): fix low-risk errcheck findings`
2. `chore(lint): resolve staticcheck deprecation warnings`
3. `fix(lint): add nil-safety guards for nilaway findings`
4. `fix(security): harden command execution paths for gosec`
5. `chore(go): bump Go patch version for govulncheck advisories`
6. Optional squash policy: keep separate commits unless explicitly requested to squash.

**Relevant files**
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/Makefile` — lint target definitions and required toolchain behavior (`vet`, `staticcheck`, `errcheck`, `nilaway`, `gosec`, `govulncheck`).
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/go.mod` — Go version/toolchain patch upgrade for stdlib advisory remediation.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/maestro/client.go` — websocket API usage flagged by `staticcheck` deprecation diagnostics.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/maestro/client_test.go` — websocket test usage and deprecation warnings.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/flutter/vmservice.go` — websocket usage flagged by `staticcheck` SA1019.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/flutter/vmservice_test.go` — websocket deprecation warnings in tests.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/driver/browser/cdp/driver_test.go` — concentrated `errcheck` findings from ignored return values in tests.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/cloud/saucelabs_test.go` — `errcheck` findings (`Setenv`, `Unsetenv`, `Unmarshal`, writes).
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/cloud/saucelabs.go` — `nilaway` potential nil-flow diagnostics on HTTP response handling.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/driver/appium/client.go` — `nilaway` diagnostics for capabilities map handling.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/driver/appium/commands.go` — `nilaway` diagnostics around nullable info/image flows.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/driver/wda/setup.go` — call paths referenced by `govulncheck` traces.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/simulator/ios.go` — `gosec` G204 subprocess findings with variable arguments.
- `/Users/prabhash.singh/pubgit/maestro-runner-enhanched/pkg/driver/wda/commands.go` — `gosec` subprocess command hardening targets.

**Verification**
1. Confirm branch and clean state checkpoints: run `rtk git status` before and after each phase.
2. Baseline once: run `rtk make vet staticcheck errcheck nilaway gosec govulncheck` and record failing counts by target.
3. After each phase commit, run only the relevant target (`rtk make errcheck`, `rtk make staticcheck`, `rtk make nilaway`, `rtk make gosec`, `rtk make govulncheck`) to verify localized fixes.
4. Final gate: run `rtk make vet staticcheck errcheck nilaway gosec govulncheck` and confirm all pass.
5. Regression confidence: run focused package tests touched by lint fixes (for example `rtk go test ./pkg/maestro/... ./pkg/flutter/... ./pkg/driver/... ./pkg/cloud/...`).

**Decisions**
- Branch name fixed to `chore/go-lint-fixes`.
- Include Go patch/toolchain upgrade in the same branch.
- Prioritize easiest fixes first, with separate commits to preserve traceability and rollback safety.
- Scope includes Go lint/security/toolchain changes only; excludes Python/TypeScript lint and unrelated refactors.

**Further Considerations**
1. Decide whether to treat some analyzer findings in tests as policy exceptions versus code changes; default recommendation is to fix in code unless clearly noisy and team-approved for exclusion.
2. If `gosec` findings are mostly false positives for safe `exec.Command` argument splitting, add narrowly scoped suppressions only with explicit justification comments and reviewer agreement.
3. If Go patch bump requires CI image/toolchain alignment, stage that as a dedicated commit and call it out in PR notes.