#!/usr/bin/env node

/**
 * CLI for task automation
 */

import process from 'node:process';
import { createCliProgram } from './cli-program';

// Parse command line arguments
createCliProgram().parse(process.argv);
