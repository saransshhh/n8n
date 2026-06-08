#!/usr/bin/env node
/**
 * validate-workflows.js
 *
 * Lints changed n8n workflow JSON files for production safety. Reads rules from
 * manifests/environment-rules.json. Run on PRs into develop (warn) and prod-main (block).
 *
 * Usage: node scripts/validate-workflows.js <file1.json> [file2.json ...]
 *        (pass the list of changed workflow files; CI computes the diff)
 *
 * Checks (starting set - extend as needed):
 *   - valid JSON
 *   - workflow id present
 *   - workflow name present
 *   - no forbidden URL patterns (localhost, dev hosts, ngrok, etc.)
 *   - no forbidden webhook path patterns (test/tmp/debug)
 * Exit 1 on any error.
 */
const fs = require('fs');
const path = require('path');

const rules = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'manifests', 'environment-rules.json'), 'utf8')).validation; }
  catch (e) { return {}; }
})();

const forbiddenUrl = (rules.forbiddenUrlPatterns || []).map(p => new RegExp(p, 'i'));
const forbiddenHook = (rules.forbiddenWebhookPathPatterns || []).map(p => new RegExp(p, 'i'));

const files = process.argv.slice(2);
if (!files.length) { console.log('No files passed; nothing to validate.'); process.exit(0); }

let failed = false;
for (const file of files) {
  const errs = [];
  let wf;
  try { wf = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error(`${file}: INVALID JSON - ${e.message}`); failed = true; continue; }

  if (rules.requireWorkflowId && !(wf.id || wf.workflowId)) errs.push('missing workflow id');
  if (rules.requireWorkflowName && !wf.name) errs.push('missing workflow name');

  const raw = JSON.stringify(wf);
  for (const re of forbiddenUrl) {
    if (re.test(raw)) errs.push(`forbidden URL pattern: /${re.source}/`);
  }
  // Inspect webhook node paths if present
  for (const node of (wf.nodes || [])) {
    const p = node && node.parameters && node.parameters.path;
    if (typeof p === 'string') {
      for (const re of forbiddenHook) {
        if (re.test(p)) errs.push(`forbidden webhook path "${p}" in node "${node.name}"`);
      }
    }
  }

  if (errs.length) {
    failed = true;
    console.error(`${file}:`);
    for (const e of errs) console.error('  - ' + e);
  } else {
    console.log(`${file}: ok`);
  }
}

process.exit(failed ? 1 : 0);
