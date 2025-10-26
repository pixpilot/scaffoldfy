import process from 'node:process';

/**
 * Detects if a GitHub repository belongs to an organization
 * @param {string} repoUrl - The GitHub repository URL
 * @returns {Promise<string|undefined>} - Organization name if it's an org, undefined if it's a user
 */
async function detectGitHubOrg(repoUrl) {
  try {
    // Extract owner from GitHub URL
    const match = repoUrl.match(/github\.com\/(?<temp1>[^/]+)/u);
    if (!match) {
      throw new Error('Invalid GitHub URL');
    }

    const owner = match[1];

    // Call GitHub API to get owner information
    const response = await fetch(`https://api.github.com/users/${owner}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // Check if the type is 'Organization'
    return data.type === 'Organization' ? owner : undefined;
  } catch (error) {
    console.error('Error detecting GitHub org:', error);
    throw error;
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);
let repoUrl = '';

for (const arg of args) {
  if (arg.startsWith('--repoUrl=')) {
    repoUrl = arg.substring('--repoUrl='.length);
  }
}

if (!repoUrl) {
  console.error('Error: --repoUrl argument is required');
  process.exit(1);
}

// Run the function and output the result
detectGitHubOrg(repoUrl)
  .then((orgName) => {
    // Output to stdout (this is what scaffoldfy captures)
    // If it's an org, output the org name; otherwise output empty string or the owner name
    if (orgName) {
      process.stdout.write(orgName);
    } else {
      // If it's not an org (it's a user), you might want to output the user name
      // or just output nothing/empty string
      process.stdout.write('');
    }
  })
  .catch((error) => {
    console.error('Failed to detect GitHub org:', error.message);
    process.exit(1);
  });
