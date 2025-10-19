import { packageGenerator } from '@pixpilot/workspace-package-generator';

module.exports = function generator(plop: unknown) {
  packageGenerator(plop, {
    author: 'PixPilot <m.doaie@hotmail.com>',

    orgName: 'pixpilot',
  });
};
