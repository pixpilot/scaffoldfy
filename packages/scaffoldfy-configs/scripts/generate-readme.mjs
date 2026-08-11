import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readmePath = path.join(packageDirectory, 'README.md');
const packageUrl = 'https://unpkg.com/@pixpilot/scaffoldfy-configs@latest';
const startMarker = '<!-- scaffoldfy-templates:start -->';
const endMarker = '<!-- scaffoldfy-templates:end -->';
const ignoredDirectories = new Set(['.cache', '.turbo', 'node_modules']);

async function findConfigPaths(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map((entry) => {
      if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
        return findConfigPaths(path.join(directory, entry.name));
      }
      if (entry.isFile() && entry.name === 'scaffoldfy.json') {
        return [path.join(directory, entry.name)];
      }
      return [];
    }),
  );

  return paths.flat();
}

async function readTemplate(configPath) {
  const relativeDirectory = path
    .relative(packageDirectory, path.dirname(configPath))
    .split(path.sep)
    .join('/');
  const relativeConfigPath = relativeDirectory
    ? `${relativeDirectory}/scaffoldfy.json`
    : 'scaffoldfy.json';
  const config = JSON.parse(await readFile(configPath, 'utf8'));

  if (typeof config.description !== 'string' || !config.description.trim()) {
    throw new Error(`${relativeConfigPath} has no description`);
  }

  return {
    configUrl: `${packageUrl}/${relativeConfigPath}`,
    description: config.description.trim(),
    name: relativeDirectory || config.name,
  };
}

function compareTemplates(left, right) {
  if (left.name === right.name) {
    return 0;
  }
  return left.name < right.name ? -1 : 1;
}

async function generateReadme() {
  const configPaths = await findConfigPaths(packageDirectory);
  const templates = await Promise.all(configPaths.map(readTemplate));
  templates.sort(compareTemplates);

  const generatedSection = templates
    .map(
      ({ configUrl, description, name }) =>
        `### ${name}\n\n${description}\n\nUsage:\n\n\`\`\`sh\nnpx @pixpilot/scaffoldfy@latest --config ${configUrl}\n\`\`\``,
    )
    .join('\n\n');
  const readme = await readFile(readmePath, 'utf8');
  const startIndex = readme.indexOf(startMarker);
  const endIndex = readme.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error('README.md is missing the template section markers');
  }

  const before = readme.slice(0, startIndex + startMarker.length);
  const after = readme.slice(endIndex);
  const generatedReadme = `${before}\n\n${generatedSection}\n\n${after}`;

  if (generatedReadme !== readme) {
    await writeFile(readmePath, generatedReadme);
    console.log(`Updated README.md with ${templates.length} templates.`);
  } else {
    console.log(`README.md is current (${templates.length} templates).`);
  }
}

await generateReadme();
