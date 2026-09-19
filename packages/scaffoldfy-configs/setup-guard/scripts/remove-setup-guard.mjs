#!/usr/bin/env node
/**
 * Strips a template's one-time setup gate from the generated project.
 *
 * A template that ships a setup gate has a small guard script (default
 * `setup/guard.mjs`) wired into `postinstall` and `.husky/pre-commit`, so a
 * fresh clone nags on install and refuses to commit until the initializer has
 * been run. This removes those call sites once setup is underway.
 *
 * It deliberately does NOT delete the folder holding the guard: templates often
 * keep other setup assets beside it (handlebars templates, for instance) that
 * later tasks still read. Each template owns that `delete` task and places it
 * after whatever needs those assets.
 *
 * Usage:
 *   node remove-setup-guard.mjs [--guard=setup/guard.mjs] [--setup-script=setup]
 *
 * Exits non-zero if a reference survives, so the run stops before any task
 * deletes a script that something still calls.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** @param {string} prefix */
function getArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg?.slice(prefix.length);
}

const guardRef = getArg('--guard=') || 'setup/guard.mjs';
const setupScript = getArg('--setup-script=') || 'setup';
const root = process.cwd();

const JSON_INDENT = 2;
const README_SENTINEL = 'SKIP_SETUP_CHECK';

/*
 * Matched loosely on purpose: earlier tasks in a scaffoldfy run re-serialize
 * package.json and can rewrite hook files, so exact-string matching is unsafe.
 */
const escapedRef = guardRef.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const guardSegment = new RegExp(
  `\\s*&&\\s+node\\s+${escapedRef}(?:\\s+\\w+)?|node\\s+${escapedRef}(?:\\s+\\w+)?\\s+&&\\s*`,
  'u',
);

const done = [];
const skipped = [];

/** @param {string} relativePath */
function readIfPresent(relativePath) {
  const full = path.join(root, relativePath);
  return fs.existsSync(full) ? { full, text: fs.readFileSync(full, 'utf8') } : null;
}

// 1. package.json -- drop the setup script and unchain the guard from any script.
{
  const file = readIfPresent('package.json');
  if (file == null) {
    skipped.push('package.json not found');
  } else {
    const pkg = JSON.parse(file.text);
    const scripts = pkg.scripts ?? {};
    let changed = false;

    if (setupScript in scripts) {
      delete scripts[setupScript];
      changed = true;
      done.push(`removed scripts.${setupScript}`);
    }

    const guarded = Object.entries(scripts).filter(
      ([, value]) => typeof value === 'string' && value.includes(guardRef),
    );

    for (const [name, value] of guarded) {
      const stripped = value.replace(guardSegment, '').trim();
      /*
       * Either the guard was one link in a chain (strip it, keep the rest), or
       * the script existed only to call the guard. An empty script value would
       * break `pnpm install`, so drop the key entirely.
       */
      if (stripped === '' || stripped.includes(guardRef)) {
        delete scripts[name];
        done.push(`removed scripts.${name}`);
      } else {
        scripts[name] = stripped;
        done.push(`unchained guard from scripts.${name}`);
      }
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file.full, `${JSON.stringify(pkg, null, JSON_INDENT)}\n`);
    } else {
      skipped.push('package.json already clean');
    }
  }
}

// 2. Git hooks -- drop the guard line wherever it was wired in.
{
  const hooksDirectory = path.join(root, '.husky');
  const hooks = fs.existsSync(hooksDirectory)
    ? fs
        .readdirSync(hooksDirectory, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => `.husky/${entry.name}`)
    : [];

  for (const hook of hooks) {
    const file = readIfPresent(hook);

    if (file != null && file.text.includes(guardRef)) {
      const kept = [];

      for (const line of file.text.split('\n')) {
        if (line.includes(guardRef)) {
          // Also drop the comment that introduced the check, and its blank line.
          while (kept.length > 0 && kept[kept.length - 1].trimStart().startsWith('#')) {
            kept.pop();
          }
          while (kept.length > 0 && kept[kept.length - 1].trim() === '') {
            kept.pop();
          }
        } else {
          kept.push(line);
        }
      }

      fs.writeFileSync(file.full, kept.join('\n'));
      done.push(`removed guard from ${hook}`);
    }
  }
}

/*
 * 3. README.md -- usually moot, since templates rewrite the README from their
 * own clean-readme template. Kept as a safety net when that task is disabled.
 */
{
  const file = readIfPresent('README.md');
  if (file != null && file.text.includes(README_SENTINEL)) {
    const lines = file.text.split('\n');
    let start = lines.findIndex((line) => line.includes(README_SENTINEL));

    // Walk back to the top of the paragraph, then forward past its blank line.
    while (start > 0 && lines[start - 1].trim() !== '') {
      start -= 1;
    }
    let end = start;
    while (end < lines.length && lines[end].trim() !== '') {
      end += 1;
    }
    while (end < lines.length && lines[end].trim() === '') {
      end += 1;
    }

    lines.splice(start, end - start);
    fs.writeFileSync(file.full, lines.join('\n'));
    done.push('removed setup note from README.md');
  }
}

for (const message of done) {
  console.warn(`  setup-guard: ${message}`);
}
for (const message of skipped) {
  console.warn(`  setup-guard: skipped -- ${message}`);
}

/*
 * 4. Verify. A template deletes the guard's folder in a later task, so a
 * surviving reference has to stop the run now -- otherwise the project is left
 * calling a script that no longer exists, and every `pnpm install` fails.
 */
const searched = ['package.json', 'README.md'];
if (fs.existsSync(path.join(root, '.husky'))) {
  for (const entry of fs.readdirSync(path.join(root, '.husky'), {
    withFileTypes: true,
  })) {
    if (entry.isFile()) {
      searched.push(`.husky/${entry.name}`);
    }
  }
}

const leftovers = searched.filter((relativePath) =>
  readIfPresent(relativePath)?.text.includes(guardRef),
);

if (leftovers.length > 0) {
  console.error(
    `  setup-guard: ERROR -- these still reference ${guardRef}: ${leftovers.join(', ')}`,
  );
  console.error('  setup-guard: remove those lines by hand, then re-run setup.');
  process.exit(1);
}
