import makeConfig from '@pixpilot/eslint-config';

/**
 * @type {(options?: { rules?: Record<string, any> }) => Promise<ReturnType<typeof makeConfig>>}
 */
export default async (options = {}) => {
  const base = await makeConfig({ pnpm: false, turbo: true });
  return [...base, ...(options.rules ? [{ rules: options.rules }] : [])];
};
