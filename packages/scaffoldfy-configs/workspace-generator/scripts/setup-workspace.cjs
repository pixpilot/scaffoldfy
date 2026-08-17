#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const process = require('node:process');

const BASE_TEMPLATE_REPOSITORY =
  'https://github.com/pixpilot/pnpm-turbo-monorepo-template.git';

const APP_TEMPLATES = {
  'nextjs-cloudflare': {
    repository: 'https://github.com/ccpu/nextjs-cloudflare-monorepo-template.git',
    sourceDirectory: 'apps/web',
    destinationDirectory: 'apps/web',
    rootScripts: ['web:dev', 'web:build'],
  },
  'chrome-extension': {
    repository: 'https://github.com/ccpu/chrome-extension-monorepo-template.git',
    sourceDirectory: 'apps/chrome-extension',
    destinationDirectory: 'apps/chrome-extension',
    rootScripts: ['dev'],
  },
  expo: {
    repository: 'https://github.com/ccpu/full-stack-starter.git',
    sourceDirectory: 'apps/expo',
    destinationDirectory: 'apps/expo',
    rootScripts: [
      'native',
      'expo:clean:install',
      'expo:clean:run',
      'android:dev',
      'android:clean:dev',
      'ios:dev',
      'ios:clean:dev',
    ],
  },
};

const TEMPLATE_SOURCE_PATHS = [
  'package.json',
  'pnpm-workspace.yaml',
  'packages',
  'tooling',
  '.github/workflows',
];
const JSON_INDENTATION = 2;
const LINE_BREAK_PATTERN = /\r?\n/u;
const TOP_LEVEL_SECTION_PATTERN = /^[^\s#][^:]*:/u;
const INDENTED_LIST_ENTRY_PATTERN = /^ {2}- /u;

function runGit(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'inherit' });
}

function refreshLockfile(cwd) {
  execFileSync('pnpm', ['install', '--lockfile-only', '--ignore-scripts'], {
    cwd,
    stdio: 'inherit',
  });
}

function getSelectedApps() {
  return new Set(
    (process.env.WORKSPACE_APPS ?? '')
      .split(',')
      .map((app) => app.trim())
      .filter(Boolean),
  );
}

function ensureEmptyDirectory(directory) {
  if (fs.readdirSync(directory).length > 0) {
    throw new Error(`Workspace directory must be empty: ${directory}`);
  }
}

function copyDirectoryContents(sourceDirectory, destinationDirectory) {
  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    fs.cpSync(
      path.join(sourceDirectory, entry.name),
      path.join(destinationDirectory, entry.name),
      { recursive: entry.isDirectory(), errorOnExist: true, force: false },
    );
  }
}

function overlayDirectoryContents(sourceDirectory, destinationDirectory) {
  if (!fs.existsSync(sourceDirectory)) {
    return;
  }

  fs.mkdirSync(destinationDirectory, { recursive: true });

  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    fs.cpSync(
      path.join(sourceDirectory, entry.name),
      path.join(destinationDirectory, entry.name),
      { recursive: entry.isDirectory(), force: true },
    );
  }
}

function mergeDependencySections(basePackage, templatePackage) {
  return [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ].reduce(
    (mergedPackage, section) =>
      templatePackage[section]
        ? {
            ...mergedPackage,
            [section]: {
              ...templatePackage[section],
              ...mergedPackage[section],
            },
          }
        : mergedPackage,
    basePackage,
  );
}

function mergeRootPackageManifest(template, repositoryDirectory, workspaceDirectory) {
  const packageJsonPath = path.join(workspaceDirectory, 'package.json');
  const templatePackageJsonPath = path.join(repositoryDirectory, 'package.json');
  const basePackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const templatePackage = JSON.parse(fs.readFileSync(templatePackageJsonPath, 'utf8'));
  const packageWithDependencies = mergeDependencySections(basePackage, templatePackage);
  const templateScripts = Object.fromEntries(
    template.rootScripts.flatMap((scriptName) => {
      const script = templatePackage.scripts?.[scriptName];

      return script ? [[scriptName, script]] : [];
    }),
  );

  const mergedPackage = {
    ...packageWithDependencies,
    scripts: {
      ...templateScripts,
      ...packageWithDependencies.scripts,
    },
  };

  fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(mergedPackage, null, JSON_INDENTATION)}\n`,
  );
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function normalizeYamlKey(value) {
  return value.replace(/^['"]|['"]$/gu, '');
}

function getCatalogEntries(workspaceManifest) {
  const catalogEntries = new Map();
  let isInCatalogsSection = false;
  let catalogName;

  for (const line of workspaceManifest.split(LINE_BREAK_PATTERN)) {
    if (line === 'catalogs:') {
      isInCatalogsSection = true;
    } else if (isInCatalogsSection && TOP_LEVEL_SECTION_PATTERN.test(line)) {
      isInCatalogsSection = false;
    } else if (isInCatalogsSection) {
      const catalogMatch = line.match(/^ {2}(?<catalogName>[^:\r\n]+):[\t ]*$/u);
      const entryMatch = line.match(/^ {4}(?<key>['"][^'"]+['"]|[^:]+):/u);

      if (catalogMatch) {
        const { catalogName: nextCatalogName } = catalogMatch.groups;
        catalogName = nextCatalogName;
        catalogEntries.set(catalogName, []);
      } else if (catalogName && entryMatch) {
        const { key } = entryMatch.groups;
        catalogEntries.get(catalogName).push({ key, line });
      }
    }
  }

  return catalogEntries;
}

function getYamlListEntries(workspaceManifest, sectionName) {
  const entries = [];
  let isInSection = false;

  for (const line of workspaceManifest.split(LINE_BREAK_PATTERN)) {
    if (line === `${sectionName}:`) {
      isInSection = true;
    } else if (isInSection && TOP_LEVEL_SECTION_PATTERN.test(line)) {
      isInSection = false;
    } else if (isInSection && INDENTED_LIST_ENTRY_PATTERN.test(line)) {
      entries.push(line);
    }
  }

  return entries;
}

function mergeCatalogEntries(baseWorkspaceManifest, templateWorkspaceManifest) {
  let mergedWorkspaceManifest = baseWorkspaceManifest;
  const lineEnding = baseWorkspaceManifest.includes('\r\n') ? '\r\n' : '\n';

  for (const [catalogName, entries] of getCatalogEntries(templateWorkspaceManifest)) {
    const catalogHeader = new RegExp(
      `^ {2}${escapeRegularExpression(catalogName)}:[\\t ]*(?:\\r?\\n|$)`,
      'mu',
    );

    if (!catalogHeader.test(mergedWorkspaceManifest)) {
      mergedWorkspaceManifest = mergedWorkspaceManifest.replace(
        /^catalogs:[\t ]*(?:\r?\n|$)/mu,
        (header) =>
          `${header}  ${catalogName}:${lineEnding}${entries.map((entry) => entry.line).join(lineEnding)}${lineEnding}`,
      );
    } else {
      for (const entry of entries) {
        const entryPattern = new RegExp(
          `^ {4}['"]?${escapeRegularExpression(normalizeYamlKey(entry.key))}['"]?:[^\\r\\n]*`,
          'mu',
        );

        if (entryPattern.test(mergedWorkspaceManifest)) {
          mergedWorkspaceManifest = mergedWorkspaceManifest.replace(
            entryPattern,
            entry.line,
          );
        } else {
          const catalogMatch = catalogHeader.exec(mergedWorkspaceManifest);
          const catalogContents = mergedWorkspaceManifest.slice(
            catalogMatch.index + catalogMatch[0].length,
          );
          const nextCatalogMatch = catalogContents.match(
            /^(?: {2})?[^\s#][^:]*:[\t ]*(?:\r?\n|$)/mu,
          );
          const insertionIndex = nextCatalogMatch
            ? catalogMatch.index + catalogMatch[0].length + nextCatalogMatch.index
            : mergedWorkspaceManifest.length;

          mergedWorkspaceManifest = `${mergedWorkspaceManifest.slice(0, insertionIndex)}${entry.line}${lineEnding}${mergedWorkspaceManifest.slice(insertionIndex)}`;
        }
      }
    }
  }

  return mergedWorkspaceManifest;
}

function mergeYamlListEntries(
  baseWorkspaceManifest,
  templateWorkspaceManifest,
  sectionName,
) {
  const templateEntries = getYamlListEntries(templateWorkspaceManifest, sectionName);
  if (templateEntries.length === 0) {
    return baseWorkspaceManifest;
  }

  const lineEnding = baseWorkspaceManifest.includes('\r\n') ? '\r\n' : '\n';
  const lines = baseWorkspaceManifest.split(LINE_BREAK_PATTERN);
  const sectionIndex = lines.indexOf(`${sectionName}:`);

  if (sectionIndex === -1) {
    return `${baseWorkspaceManifest.trimEnd()}${lineEnding}${sectionName}:${lineEnding}${templateEntries.join(lineEnding)}${lineEnding}`;
  }

  let sectionEndIndex = sectionIndex + 1;
  while (
    sectionEndIndex < lines.length &&
    !TOP_LEVEL_SECTION_PATTERN.test(lines[sectionEndIndex])
  ) {
    sectionEndIndex += 1;
  }

  const existingEntries = new Set(
    lines
      .slice(sectionIndex + 1, sectionEndIndex)
      .filter((line) => INDENTED_LIST_ENTRY_PATTERN.test(line)),
  );
  const missingEntries = templateEntries.filter((entry) => !existingEntries.has(entry));

  lines.splice(sectionEndIndex, 0, ...missingEntries);
  return lines.join(lineEnding);
}

function mergeWorkspaceManifest(templateWorkspaceManifestPath, workspaceManifestPath) {
  const baseWorkspaceManifest = fs.readFileSync(workspaceManifestPath, 'utf8');
  const templateWorkspaceManifest = fs.readFileSync(
    templateWorkspaceManifestPath,
    'utf8',
  );
  const catalogMergedWorkspaceManifest = mergeCatalogEntries(
    baseWorkspaceManifest,
    templateWorkspaceManifest,
  );
  const mergedWorkspaceManifest = mergeYamlListEntries(
    catalogMergedWorkspaceManifest,
    templateWorkspaceManifest,
    'packages',
  );
  const workspaceManifestWithTemplatePackages = mergeYamlListEntries(
    mergedWorkspaceManifest,
    templateWorkspaceManifest,
    'onlyBuiltDependencies',
  );

  fs.writeFileSync(workspaceManifestPath, workspaceManifestWithTemplatePackages);
}

function addAppTemplate(template, workspaceDirectory) {
  const destinationDirectory = path.join(
    workspaceDirectory,
    template.destinationDirectory,
  );
  fs.mkdirSync(destinationDirectory, { recursive: true });

  if (fs.readdirSync(destinationDirectory).length > 0) {
    throw new Error(`App destination already exists: ${destinationDirectory}`);
  }

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-app-'));
  const repositoryDirectory = path.join(temporaryDirectory, 'repository');

  try {
    runGit(
      [
        'clone',
        '--depth',
        '1',
        '--filter=blob:none',
        '--sparse',
        template.repository,
        repositoryDirectory,
      ],
      workspaceDirectory,
    );
    runGit(
      [
        'sparse-checkout',
        'set',
        '--skip-checks',
        template.sourceDirectory,
        ...TEMPLATE_SOURCE_PATHS,
      ],
      repositoryDirectory,
    );

    const sourceDirectory = path.join(repositoryDirectory, template.sourceDirectory);
    if (!fs.existsSync(sourceDirectory)) {
      throw new Error(
        `Template directory "${template.sourceDirectory}" was not found in ${template.repository}`,
      );
    }

    copyDirectoryContents(sourceDirectory, destinationDirectory);
    overlayDirectoryContents(
      path.join(repositoryDirectory, 'packages'),
      path.join(workspaceDirectory, 'packages'),
    );
    overlayDirectoryContents(
      path.join(repositoryDirectory, 'tooling'),
      path.join(workspaceDirectory, 'tooling'),
    );
    overlayDirectoryContents(
      path.join(repositoryDirectory, '.github', 'workflows'),
      path.join(workspaceDirectory, '.github', 'workflows'),
    );
    mergeRootPackageManifest(template, repositoryDirectory, workspaceDirectory);

    const templateWorkspaceManifestPath = path.join(
      repositoryDirectory,
      'pnpm-workspace.yaml',
    );
    const workspaceManifestPath = path.join(workspaceDirectory, 'pnpm-workspace.yaml');

    mergeWorkspaceManifest(templateWorkspaceManifestPath, workspaceManifestPath);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function main() {
  const workspaceDirectory = process.cwd();
  const selectedApps = getSelectedApps();
  const selectedTemplates = [...selectedApps].filter((app) => APP_TEMPLATES[app]);

  if (selectedApps.size === 0) {
    throw new Error('Select at least one workspace app.');
  }

  ensureEmptyDirectory(workspaceDirectory);
  runGit(['clone', '--depth', '1', BASE_TEMPLATE_REPOSITORY, '.'], workspaceDirectory);

  for (const app of selectedTemplates) {
    addAppTemplate(APP_TEMPLATES[app], workspaceDirectory);
  }

  if (selectedTemplates.length > 0) {
    refreshLockfile(workspaceDirectory);
  }
}

main();
