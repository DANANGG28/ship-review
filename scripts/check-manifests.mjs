#!/usr/bin/env node
/**
 * Assert the two manifests agree.
 *
 * `plugin.json` is the portable descriptor read by Agent Skills hosts.
 * `package.json` is the host adapter read by oh-my-pi and npm. Neither can
 * derive from the other, so this check is the single invariant that keeps
 * them from drifting. `npm run check` fails on any mismatch.
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"))

const plugin = read("plugin.json")
const pkg = read("package.json")

const EXPECTED_SCHEMA =
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"
const NAME_PATTERN = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/

const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

check(plugin.$schema === EXPECTED_SCHEMA, `plugin.json $schema must be ${EXPECTED_SCHEMA}`)
check(typeof plugin.name === "string" && NAME_PATTERN.test(plugin.name), "plugin.json name fails the Agent Plugins pattern")
check(plugin.name.length <= 64, "plugin.json name exceeds 64 characters")
check(plugin.name === pkg.name, `name mismatch: plugin.json "${plugin.name}" vs package.json "${pkg.name}"`)
check(plugin.version === pkg.version, `version mismatch: plugin.json "${plugin.version}" vs package.json "${pkg.version}"`)
check(plugin.description === pkg.description, "description mismatch between plugin.json and package.json")
check(plugin.license === pkg.license, `license mismatch: plugin.json "${plugin.license}" vs package.json "${pkg.license}"`)

const commands = plugin.keywords?.includes("agent-plugins")
check(commands === true, "plugin.json keywords must include agent-plugins")

if (failures.length > 0) {
  console.error("manifest check failed:")
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}

console.log(`manifest check ok: ${plugin.name}@${plugin.version}`)
