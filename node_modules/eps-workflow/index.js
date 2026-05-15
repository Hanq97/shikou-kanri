// eps-workflow main entry
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });

module.exports = {
  stateManager: () => require('./core/state/state-manager'),
  stackManager: () => require('./core/state/stack-manager'),
  ops: () => require('./core/cli/ops'),
  version: require('./package.json').version
};
