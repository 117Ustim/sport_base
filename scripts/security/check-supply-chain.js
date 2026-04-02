#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const compromisedPackages = new Map([
  ["axios", new Set(["1.14.1", "0.30.4"])],
  ["plain-crypto-js", new Set(["4.2.1"])],
]);

const highConfidenceIndicators = [
  "sfrclak.com",
  "callnrwise.com",
  "nrwise@proton.me",
  "ifstap@proton.me",
  "142.11.206.73",
];

const lockfiles = [
  "package-lock.json",
  path.join("functions", "package-lock.json"),
];

const manifests = ["package.json", path.join("functions", "package.json")];

const args = new Set(process.argv.slice(2));
const modeFromEnv = (process.env.SUPPLY_CHAIN_GUARD_MODE || "").toLowerCase();
const enforce = args.has("--enforce") || modeFromEnv === "enforce" || modeFromEnv === "fail";

const findings = [];
const findingKeys = new Set();

function addFinding(type, file, details) {
  const key = `${type}|${file}|${details}`;
  if (findingKeys.has(key)) return;
  findingKeys.add(key);
  findings.push({ type, file, details });
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    addFinding("invalid-json", filePath, `Cannot parse JSON: ${error.message}`);
    return null;
  }
}

function normalizeNameFromPath(packagePath) {
  if (!packagePath) return null;
  const marker = "node_modules/";
  const markerIndex = packagePath.lastIndexOf(marker);
  if (markerIndex < 0) return null;
  const tail = packagePath.slice(markerIndex + marker.length);
  if (!tail) return null;

  const parts = tail.split("/");
  if (!parts[0]) return null;
  if (parts[0].startsWith("@") && parts.length > 1) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

function checkPackageVersion(packageName, version, filePath, context) {
  if (!packageName || !version) return;
  const compromisedVersions = compromisedPackages.get(packageName);
  if (!compromisedVersions) return;
  if (!compromisedVersions.has(String(version))) return;

  addFinding(
    "compromised-package",
    filePath,
    `${packageName}@${version} detected in ${context}`
  );
}

function inspectTextIndicators(text, filePath) {
  for (const indicator of highConfidenceIndicators) {
    if (text.includes(indicator)) {
      addFinding("ioc-match", filePath, `Indicator found: ${indicator}`);
    }
  }
}

function inspectDependenciesTree(dependencies, filePath, contextPrefix) {
  if (!dependencies || typeof dependencies !== "object") return;
  for (const [name, meta] of Object.entries(dependencies)) {
    if (!meta || typeof meta !== "object") continue;
    checkPackageVersion(name, meta.version, filePath, `${contextPrefix} > ${name}`);
    if (meta.dependencies && typeof meta.dependencies === "object") {
      inspectDependenciesTree(meta.dependencies, filePath, `${contextPrefix} > ${name}`);
    }
  }
}

function inspectLockfile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) return;

  const raw = fs.readFileSync(absolutePath, "utf8");
  inspectTextIndicators(raw, absolutePath);

  const lockfile = readJsonIfExists(absolutePath);
  if (!lockfile) return;

  if (lockfile.packages && typeof lockfile.packages === "object") {
    for (const [packagePath, meta] of Object.entries(lockfile.packages)) {
      if (!meta || typeof meta !== "object") continue;
      const packageName = meta.name || normalizeNameFromPath(packagePath);
      checkPackageVersion(packageName, meta.version, absolutePath, `packages['${packagePath}']`);

      if (typeof meta.resolved === "string") {
        inspectTextIndicators(meta.resolved, absolutePath);
      }
    }
  }

  if (lockfile.dependencies && typeof lockfile.dependencies === "object") {
    inspectDependenciesTree(lockfile.dependencies, absolutePath, "dependencies");
  }
}

function normalizeSpec(spec) {
  if (typeof spec !== "string") return "";
  return spec.trim().replace(/^[=~^]/, "");
}

function inspectManifest(filePath) {
  const absolutePath = path.resolve(filePath);
  const manifest = readJsonIfExists(absolutePath);
  if (!manifest) return;

  const sections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
  for (const section of sections) {
    const deps = manifest[section];
    if (!deps || typeof deps !== "object") continue;

    for (const [name, spec] of Object.entries(deps)) {
      const blockedVersions = compromisedPackages.get(name);
      if (!blockedVersions) continue;

      const normalizedSpec = normalizeSpec(spec);
      for (const blockedVersion of blockedVersions) {
        if (normalizedSpec === blockedVersion) {
          addFinding(
            "compromised-manifest-spec",
            absolutePath,
            `${name}: "${spec}" in ${section}`
          );
        }
      }
    }
  }
}

for (const file of manifests) {
  inspectManifest(file);
}

for (const file of lockfiles) {
  inspectLockfile(file);
}

if (findings.length === 0) {
  console.log("Supply chain guard: no known Axios campaign indicators were found.");
  process.exit(0);
}

console.log("Supply chain guard findings:");
for (const finding of findings) {
  console.log(`- [${finding.type}] ${finding.file}: ${finding.details}`);
}

if (enforce) {
  console.error(`Found ${findings.length} issue(s). Failing because enforce mode is enabled.`);
  process.exit(1);
}

console.warn(`Found ${findings.length} issue(s). Passing in warn-only mode.`);
process.exit(0);
