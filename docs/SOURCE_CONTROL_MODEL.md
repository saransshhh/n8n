# n8n Source Control & Promotion Model

One-way promotion pipeline. Do **not** use bidirectional sync.

```
n8n.com (dev, editable)
  -> develop-sub      raw ingress (n8n pushes here)
  -> develop          clean integration branch (per-workflow PRs land here)
  -> prod-main         protected production branch (release PR gate)
  -> n8n-prod (pull-only runtime)
```

## Branch roles
| Branch | Role | n8n instance | Protected |
|---|---|---|---|
| develop-sub | Raw ingress | n8n.com (push only) | light |
| develop | Clean integration | none | yes |
| prod-main | Production release | n8n-prod (pull only) | strict |
| main (old) | Legacy archive | none | locked |

## Automation
- `1-ingress-split.yml`: on push to develop-sub, opens one PR per workflow into develop.
- `2-release-pr.yml`: on push to develop, creates/updates a single release PR develop -> prod-main.
- `3-deploy-prod.yml`: on merge to prod-main, calls n8n-prod `POST /api/v1/source-control/pull` with force=true, autoPublish=published.

## Important n8n facts (verified against docs.n8n.io)
- n8n pushes the **saved** version, not the published version.
- Git **deletion does NOT auto-delete** in n8n-prod; pull prompts a human. Production deletion is a deliberate step (see tombstones).
- Credential and variable **values are never synced** (only stubs). Provision prod values via external secrets or manually.
- `autoPublish`: `none` | `published` | `all`. We default to `published` so only already-published workflows are re-published. n8n never auto-publishes archived workflows.
- Pulling a published workflow briefly unpublishes/republishes it (seconds of downtime).

## Manifests
- `manifests/production-workflows.json`: allow-list / source of truth for prod workflows.
- `manifests/deleted-workflows.json`: tombstones; blocks resurrection of removed workflows.
- `manifests/environment-rules.json`: validation + deployment config.

## Owner-only setup (cannot be automated here)
1. Branch protection on develop and prod-main (require PR, CODEOWNERS, status checks; no direct/force push).
2. Repo secrets: `N8N_PROD_URL`, `N8N_PROD_API_KEY` (owner/admin key - pull requires owner/admin), optional `SLACK_WEBHOOK_URL`.
3. GitHub environment `production` with a required reviewer.
4. Connect n8n.com -> develop-sub (push only); n8n-prod -> prod-main (pull only).
5. Replace placeholders in `.github/CODEOWNERS` and the manifests.

## Deprecated
- `PR_creator.yml` (develop -> main split) and `Promote_to_Production.yml` (active-flip) are superseded. Disable/remove after cutover.
