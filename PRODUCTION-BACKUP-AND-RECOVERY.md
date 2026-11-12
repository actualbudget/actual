# Production Backup and Disaster Recovery Runbook

This runbook records the verified backup setup and safe recovery procedure for
the Actual instance hosted on Fly.io. It contains no credential values. Keep
this document in version control, but store all credentials and private
deployment configuration only in their intended secret stores.

## Scope and safety

- Production Fly.io app: `actual-gm-budget-2026`
- Region: `fra`
- Persistent volume: `actual_data`, mounted at `/data`
- GitHub repository: [`aktakukac/actual`](https://github.com/aktakukac/actual)
- Backup workflow: [Production Backup](.github/workflows/backup.yml)
- Missed-backup monitor: [Production Backup Watchdog](.github/workflows/backup-watchdog.yml)
- Upstream release deployment: [Deploy upstream Actual release](.github/workflows/upstream-release-deploy.yml)
- The Fly configuration, backup-enabled image definition, and container
  backup scripts are tracked in this repository. Verify them against the live
  Fly app before using them to deploy; this runbook is not a substitute for
  that check.

Production budget data includes bank connection credentials. Treat snapshots,
restores, logs, and temporary copies as sensitive financial data. Never paste
credentials, Restic passwords, access tokens, database contents, or unredacted
logs into a pull request, issue, chat, or this repository.

Do not initialize, relocate, or prune the Restic repository manually. The
production backup process applies retention and pruning after creating a
backup. Manual workflow dispatch also invokes that process.

## Credential-free setup record

### Credentials and their locations

| Credential                                     | Required use                                                                     | Storage                                                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| App-scoped Fly SSH token                       | Lets GitHub Actions connect to the Fly app and invoke the backup trigger         | GitHub Actions repository secret `FLY_API_TOKEN`                                                                                 |
| App-scoped Fly deploy token                    | Lets the approved release workflow push and deploy a candidate image             | GitHub Actions `production` environment secret `FLY_DEPLOY_API_TOKEN`; not configured yet                                        |
| Restic repository credentials                  | Lets the deployed backup process access the existing encrypted backup repository | Fly app secrets `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`; values are not tracked |
| Actual account and budget encryption passwords | Needed for normal app access and, if enabled, decrypting encrypted budgets       | Password manager or other approved private credential store                                                                      |
| Bank connection credentials                    | Used by the live budget for bank connections                                     | Stored in the budget data; restored copies must be treated as sensitive                                                          |

Use the complete Fly token value, including any `FlyV1 ` prefix and following
space, when setting `FLY_API_TOKEN`. Never add quotes or put the token in a
workflow file. The currently configured app-scoped SSH token was validated by
a successful production backup workflow run on 2026-10-22.

If that token must be rotated, create an SSH token for this app using the
authenticated Fly CLI, then replace the GitHub secret through the repository
settings page. Do not revoke the previous token until a workflow run using the
replacement has successfully completed.

The Fly configuration and image build are tracked in this repository, but
secret values remain only in their approved secret stores. Before deployment,
verify the existing Fly secrets and app configuration against the live service.
Do not create replacement secrets or initialize a repository as part of
recovery.

The release workflow uses the separate `FLY_DEPLOY_API_TOKEN` environment
secret. Do not reuse or replace the backup workflow's `FLY_API_TOKEN`. Configure
the GitHub `production` environment with required reviewers and restrict it to
the `master` branch before adding the deploy token. The workflow fails before
contacting Fly if this secret is missing.

### Backup schedule and alerts

- The `Production Backup` workflow runs daily at 02:17 UTC (03:17 in Budapest
  during standard time and 04:17 during daylight saving time). GitHub scheduled
  workflows are best-effort and may be delayed; a delayed event still runs the
  backup rather than being silently skipped.
- The workflow connects to the existing Fly app and invokes
  `node /app/backup-trigger.cjs`. The container-side process performs and
  verifies the backup.
- The `Production Backup Watchdog` workflow runs daily at 05:17 UTC (06:17 in
  Budapest during standard time and 07:17 during daylight saving time). It
  fails if it cannot find a successful scheduled backup run for that Budapest
  calendar day. Both workflows check on every scheduled event, even if GitHub
  starts the event later than expected.
- GitHub Actions failure notifications should be enabled for the account that
  owns the scheduled workflow. Scheduled-workflow notifications go to the
  user GitHub associates with the workflow schedule. Confirm this setting in
  GitHub notification preferences.
- A successful watchdog run is evidence that GitHub found the backup
  workflow's verification step succeeded. It is not a substitute for
  periodically checking the Restic repository.

### Finding the repository in Cloudflare R2

In the Cloudflare dashboard, open **R2 Object Storage**, select the bucket
named in the `RESTIC_REPOSITORY` Fly secret, then open the repository's key
prefix if the repository URL includes one. Restic stores encrypted repository
objects there, typically under keys such as `config`, `data/`, `index/`,
`keys/`, `locks/`, and `snapshots/`. These are not individual Actual budget
files and should not be renamed, moved, or deleted in the dashboard.

The contents are encrypted and packed by Restic, so the dashboard cannot show
transactions or other readable budget files. Use `restic snapshots` and
`restic restore` to inspect or recover backup contents. The bucket name and
optional prefix depend on the existing secret value; never paste secret values
into logs, screenshots, or support requests.

To inspect activity, open the repository **Actions** tab and review both
workflows. A manual dispatch of `Production Backup` is available for a
deliberate test, but it performs a real production backup and its retention
process. Do not use it as a harmless connectivity probe.

### Verified backup evidence

On 2026-10-22, manual Production Backup run
[#2](https://github.com/aktakukac/actual/actions/runs/39779031209) completed
successfully. The new snapshot was `94d4c676` (full snapshot ID is available
from Restic), approximately 1.575 MiB.

The following read-only integrity check completed successfully at that time:

```powershell
flyctl ssh console --app actual-gm-budget-2026 --command "restic check --read-data" --pty=false
```

It read all 6 of 6 packs and reported no errors. These results are a dated
validation record, not a claim about the repository's current state.

## Routine verification

1. Review the latest `Production Backup` workflow run. Confirm the
   **Run and verify production backup** step succeeded.
2. Review the `Production Backup Watchdog` run after its daily check. A failure
   means the watchdog could not find a successful scheduled backup for that
   day, or could not query GitHub Actions successfully; inspect its log before
   treating it as a confirmed backup failure.
3. When performing a periodic repository integrity check, use the read-only
   command shown above and confirm it ends with `no errors were found`.
4. Never publish snapshot paths or logs if they could reveal private data.

An operator who needs to list snapshots can use:

```powershell
flyctl ssh console --app actual-gm-budget-2026 --command "restic snapshots --latest 1" --pty=false
```

Check the snapshot host, timestamp, and size. Do not treat the existence of an
older snapshot as proof that today's backup succeeded.

## Disaster recovery

### Restore a snapshot to a local isolated test

This procedure tests a restored copy without replacing production. It does
not, by itself, prove that the production service can be recovered or that
users can decrypt every budget.

1. Select a known snapshot ID from the verified Restic repository. Do not
   guess the ID or initialize a repository. The commands below use
   `94d4c676` as an example; replace that value with the ID you verified.
   Set the local path and container name from the selected ID:

   ```powershell
   $snapshotId = '94d4c676'
   $restorePath = Join-Path $env:USERPROFILE "Actual-restore-$snapshotId"
   $containerName = "actual-restore-$snapshotId-isolated"
   ```

2. Restore it on the authorized Fly machine to a new, unique temporary
   directory. Never start Actual from this directory on the production
   machine:

   ```powershell
   flyctl ssh console --app actual-gm-budget-2026 --command "restic restore $snapshotId --target /tmp/actual-restore-$snapshotId" --pty=false
   ```

3. Copy the restored directory to a private local folder. For example:

   ```powershell
   flyctl ssh sftp get --app actual-gm-budget-2026 --recursive "/tmp/actual-restore-$snapshotId" $restorePath
   ```

   Protect the copy as carefully as the live budget. Do not put it in a
   synchronized or shared folder unless that storage is approved for the
   financial data it contains.

4. Use a Docker network created with `--internal`. If the network does not
   exist, create it once:

   ```powershell
   docker network create --internal actual-restore-isolated
   ```

   Whether newly created or already present, inspect it before starting the
   container:

   ```powershell
   docker network inspect actual-restore-isolated --format '{{.Internal}}'
   ```

   The inspection output must be `true`. Start a separate container with a
   validated image compatible with the restored data, mounting only the
   restored copy as `/data`. The following command records the image and
   startup arguments used in the 2026-10-22 local test; use that image only
   if it is still available locally and confirmed to be the intended
   backup-enabled image:

   ```powershell
   docker run --detach --name $containerName --network actual-restore-isolated --mount "type=bind,source=$restorePath\data,target=/data" --entrypoint /usr/bin/tini actual-custom:backup-test -- node /app/backup-supervisor.cjs node build/app.js
   ```

   Before continuing, verify the new container is attached only to
   `actual-restore-isolated`. Do not attach it to `bridge`, a host network, or
   any other network; do not publish a host port or enable bank
   synchronization.

5. Verify the application health and page from inside the container, without
   connecting it to a bank:

   ```powershell
   docker exec $containerName node -e "fetch('http://127.0.0.1:5006/health').then(async r => { console.log('HTTP ' + r.status + ' ' + await r.text()); if (!r.ok) process.exitCode = 1; }).catch(error => { console.error(error.message); process.exitCode = 1; })"
   docker exec $containerName node -e "fetch('http://127.0.0.1:5006/').then(async r => { const body = await r.text(); console.log('HTTP ' + r.status + ', ' + body.length + ' bytes'); if (!r.ok) process.exitCode = 1; }).catch(error => { console.error(error.message); process.exitCode = 1; })"
   ```

   An HTTP 200 health response and page response confirm the server starts and
   serves the app. They do not confirm successful browser login, correct
   budget contents, or successful decryption.

6. If visual inspection is required, decide on a secure local-only access
   method first. Do not weaken network isolation just to make a port
   reachable. A restored budget may contain working bank credentials; do not
   sign in or enable bank sync during this test.

A test on 2026-10-22 restored snapshot `94d4c676` (1.575 MiB; 5 local files,
1,651,701 bytes), and the app returned HTTP 200 for its internal health and
web-page requests on an internal Docker network. Browser/login and budget
content verification were not completed. The test did not establish a
production recovery time objective.

### Restoring production service

The following actions can cause irreversible data loss or expose credentials.
Use an authorized operator and do not improvise these steps during an outage.

1. Preserve the original Fly app, volume, and Restic repository. Do not delete,
   reformat, detach, replace, or restore over the production volume.
2. Confirm the target snapshot with `restic snapshots`, and verify the
   repository with `restic check --read-data`.
3. If the current service is available, take and verify a fresh backup before
   any recovery changes.
4. Restore first to a separate, protected target. Confirm the required
   application image/version, storage layout, Fly configuration, secrets,
   encryption passwords, and rollback plan with the service owner.
5. Validate the restored app and budgets without bank access before deciding
   whether to cut over.
6. Have the service owner approve any production cutover. Keep the original
   volume and previous known-good deployment intact until the recovered
   service is verified and rollback is no longer needed.

This repository contains the Fly configuration, custom image build definition,
and container-side Restic/backup scripts. They have not yet been revalidated
against the live app. The release workflow is implemented but is not enabled
until its environment and deploy-token prerequisites are verified. It does not
perform a volume cutover; do not use the generic Actual Fly.io installation
instructions as a substitute for this service's configuration.

## Controlled upstream release deployment

The `Deploy upstream Actual release` workflow checks the latest stable release
from `actualbudget/actual` daily and can also be started manually. It:

- pins the candidate to the upstream release tag, then overlays this
  repository's Fly configuration and backup scripts;
- builds the image and checks its `/health` endpoint in a Docker container
  with network access disabled and no production data or credentials;
- waits for approval through the protected GitHub `production` environment,
  then pushes and deploys the exact image that passed the isolated check;
- checks the production `/health` endpoint and redeploys the previously running
  image if deployment or the post-deploy health check fails; and
- records a Git tag after success so the same upstream release is not deployed
  again automatically. Failed releases are recorded and require a manual
  dispatch with `retry_failed` enabled before another attempt.

Before enabling production deployment:

1. Verify `fly.toml`, the live app configuration, attached volume, existing
   secrets, and the current backup against the production service.
2. Inspect a successful backup and complete an isolated restore of the real
   budget with bank network access blocked. Validate the restored budget before
   approving a production deployment.
3. Configure the GitHub `production` environment with required reviewers and
   limit deployments to `master`.
4. Create a separate, app-scoped Fly deploy token and store it only as the
   environment secret `FLY_DEPLOY_API_TOKEN`. Do not use the backup SSH token.
5. Dispatch the workflow once, inspect the pinned release and isolated test,
   then approve only after reviewing the release notes and confirming a
   current backup.

The workflow does not initialize or modify Restic, access bank endpoints during
candidate testing, change Fly secrets, or cut over a restored volume. Do not
add the deploy token until the live configuration and environment protection
have been verified. The monthly review of upstream release notes and production
backup status remains an operational check even though release detection is
automated.

The workflow does not merge upstream code into this repository's `master`
branch. Monthly review of upstream changes and a separate safe volume cutover
procedure remain operational tasks.
