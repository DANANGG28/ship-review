'use strict';

/**
 * Host adapter for oh-my-pi.
 *
 * The portable artifact is `plugin.json` plus `skills/`. This module exists
 * only because oh-my-pi's extension-package loader requires a `package.json`
 * entry before it will scan sibling capability directories, and the slash
 * commands under `commands/` need that scan to run.
 *
 * It registers no behavior, no tools, no event handlers.
 */
module.exports = function shipReview(pi) {
  if (!pi || typeof pi.setLabel !== 'function') return;
  pi.setLabel('ship-review');
};
