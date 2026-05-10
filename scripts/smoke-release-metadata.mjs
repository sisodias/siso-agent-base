#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const latest = JSON.parse(readFileSync("releases/latest.json", "utf8"));
const installer = readFileSync("scripts/install-local.sh", "utf8");
const doctor = readFileSync("bin/siso-doctor", "utf8");
const where = readFileSync("bin/siso-where", "utf8");
const wrapper = readFileSync("bin/siso", "utf8");
const version = readFileSync("VERSION", "utf8").trim();

assert.match(version, /^\d+\.\d+\.\d+$/, "VERSION must be a plain semver version");
assert.equal(packageJson.version, version, "package.json version must match VERSION");
assert.equal(packageLock.version, version, "package-lock root version must match VERSION");
assert.equal(packageLock.packages?.[""]?.version, version, "package-lock package version must match VERSION");
assert.equal(latest.version, version, "releases/latest.json version must match VERSION");
assert.match(latest.notes ?? "", /\S/, "releases/latest.json notes must be non-empty");
assert.match(installer, /npm --prefix "\$ROOT" run smoke:release/, "install-local.sh must run smoke:release before install");
assert.match(installer, /npm --prefix "\$ROOT" run smoke:install-release/, "install-local.sh must run installer/release surface smoke before install");
assert.match(installer, /SISO_SKIP_RELEASE_SMOKE/, "install-local.sh must expose an explicit release-smoke bypass");
assert.match(doctor, /installed runtime matches canonical source version/, "siso doctor must verify installed/source version parity");
assert.match(doctor, /differs from canonical source version/, "siso doctor must fail on installed/source version drift");
assert.match(where, /source version:/, "siso where must print the canonical source version");
assert.match(where, /runtime version:/, "siso where must print the installed runtime version");
assert.match(where, /version status:/, "siso where must print source/runtime version status");
assert.match(where, /Installed runtime version differs from canonical source version/, "siso where must warn on source/runtime version drift");
assert.match(wrapper, /"\$\{1:-\}" == "smoke"/, "siso wrapper must expose smoke scripts");
assert.match(wrapper, /SISO smoke commands/, "siso smoke must expose help text");
assert.match(wrapper, /siso smoke release/, "siso smoke help must show focused release smoke usage");
assert.match(wrapper, /smoke_script="smoke:\$smoke_target"/, "siso smoke must map short names to smoke scripts");
assert.match(wrapper, /npm --prefix "\$INSTALL_DIR" run "\$smoke_script"/, "siso smoke must run against the active install dir");

console.log("SISO_RELEASE_METADATA_SMOKE_OK");
