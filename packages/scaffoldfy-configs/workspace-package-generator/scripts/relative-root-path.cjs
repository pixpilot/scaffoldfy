'use strict';

const path = require('node:path');
const process = require('node:process');

const workspace = process.env.SCAFFOLDFY_WORKSPACE;
if (!workspace) throw new Error('Workspace location is required');
const relative = path.relative(
  path.join(process.cwd(), workspace, 'package'),
  process.cwd(),
);
process.stdout.write(`${relative.split(path.sep).join('/')}/`);
