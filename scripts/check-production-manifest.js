#!/usr/bin/env node
/**
 * check-production-manifest.js
 *
 * Enforces the "clean prod-main" invariant:
 *   1. Every workflows/*.json file's id is listed in manifests/production-workflows.json
 *   2. Every manifest entry has a corresponding workflow file
 *   3. No workflow file uses an id listed in manifests/deleted-workflows.json (tombstone)
 *
 * Usage: node scripts/check-production-manifest.js [--branch <name>]
 * Exit code 0 = pass, 1 = fail. Intended as a REQUIRED check on prod-main PRs
 * and a WARNING on develop PRs.
 *
 * NOTE: This is a starting stub. Adjust id-extraction to match your n8n export
 * format (n8n typically stores the workflow id inside the JSON as ".id").
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const WF_DIR = path.join(ROOT, 'workflows');
const MANIFEST = path.join(ROOT, 'manifests', 'production-workflows.json');
const TOMBSTONES = path.join(ROOT, 'manifests', 'deleted-workflows.json');

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return fallback; }
}

function main() {
  const errors = [];
  const manifest = readJson(MANIFEST, { productionWorkflows: [] });
  const tombstones = readJson(TOMBSTONES, { deletedWorkflows: [] });
  const allowedIds = new Set((manifest.productionWorkflows || []).map(w => w.id));
  const deletedIds = new Set((tombstones.deletedWorkflows || []).map(w => w.id));

  let files = [];
  try { files = fs.readdirSync(WF_DIR).filter(f => f.endsWith('.json')); }
  catch (e) { console.log('No workflows/ dir found; skipping file checks.'); }

  const fileIds = new Set();
  for (const f of files) {
    const wf = readJson(path.join(WF_DIR, f), null);
    const id = (wf && (wf.id || wf.workflowId)) || path.basename(f, '.json');
    fileIds.add(id);
    if (deletedIds.has(id)) {
      errors.push(`TOMBSTONE: workflow id "${id}" (${f}) is in deleted-workflows.json and must not be re-added.`);
    }
    if (!allowedIds.has(id)) {
      errors.push(`UNLISTED: workflow id "${id}" (${f}) is not in production-workflows.json. Add a manifest entry (label: new-prod-workflow) or remove the file.`);
    }
  }

  for (const w of (manifest.productionWorkflows || [])) {
    if (w.id === 'REPLACE_WITH_WORKFLOW_ID') continue; // example placeholder
    if (!fileIds.has(w.id)) {
      errors.push(`MISSING FILE: manifest lists "${w.id}" but no matching workflow file was found.`);
    }
  }

  if (errors.length) {
    console.error('Production manifest check FAILED:');
    for (const e of errors) console.error(' - ' + e);
    process.exit(1);
  }
  console.log('Production manifest check passed.');
}

main();
