# n8n

Local setup for an end-to-end PR workflow with separate **dev** and **prod** n8n instances.

## Goal

- **Dev instance** is the source of truth and stores every workflow.
- **Prod instance** only runs **published** workflows.
- Workflows in **prod** are **not edited directly**.
- Changes move to prod through the PR/review/publish process.

## Environment model

### Dev

- Create and edit workflows here
- Test changes before opening a PR
- Keep draft and in-progress workflows here

### Prod

- Only deploy workflows that are approved and published
- Treat published workflows as read-only
- Use prod for execution and monitoring, not authoring

## End-to-end PR process

1. Build or update the workflow in the **dev** instance.
2. Export the workflow definition from dev.
3. Open a PR with the workflow change.
4. Review and approve the PR.
5. Import the approved workflow into **prod**.
6. Publish/activate it in prod.

## Operating rules

- Do not create or edit workflows directly in prod.
- If a prod workflow needs a change, make the update in dev first.
- Only approved workflow versions should be promoted to prod.
- Keep dev ahead of prod so draft work never blocks production execution.