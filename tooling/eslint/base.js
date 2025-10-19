import makeConfig from '@pixpilot/eslint-config';

/**
 * @type {(options?: { rules?: Record<string, any> }) => Promise<ReturnType<typeof makeConfig>>}
 */
export default async (options = {}) => {
  const base = await makeConfig({ pnpm: false, turbo: true });
  if (options.rules) {
    // Assume base is an array of config objects, add a new object with the additional rules
    return [...base, { rules: options.rules }];
  }
  return base;
};
