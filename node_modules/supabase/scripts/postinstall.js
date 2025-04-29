#!/usr/bin/env node

// Ref 1: https://github.com/sanathkr/go-npm
// Ref 2: https://medium.com/xendit-engineering/how-we-repurposed-npm-to-publish-and-distribute-our-go-binaries-for-internal-cli-23981b80911b
"use strict";

import binLinks from "bin-links";
import { createHash } from "crypto";
import fs from "fs";
import fetch from "node-fetch";
import { Agent } from "https";
import { HttpsProxyAgent } from "https-proxy-agent";
import path from "path";
import { extract } from "tar";
import zlib from "zlib";

// Mapping from Node's `process.arch` to Golang's `$GOARCH`
const ARCH_MAPPING = {
  x64: "amd64",
  arm64: "arm64",
};

// Mapping between Node's `process.platform` to Golang's
const PLATFORM_MAPPING = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
};

const arch = ARCH_MAPPING[process.arch];
const platform = PLATFORM_MAPPING[process.platform];

// TODO: import pkg from "../package.json" assert { type: "json" };
const readPackageJson = async () => {
  const contents = await fs.promises.readFile("package.json");
  return JSON.parse(contents);
};

// Build the download url from package.json
const getDownloadUrl = (packageJson) => {
  const pkgName = packageJson.name;
  const version = packageJson.version;
  const repo = packageJson.repository;
  const url = `https://github.com/${repo}/releases/download/v${version}/${pkgName}_${platform}_${arch}.tar.gz`;
  return url;
};

const fetchAndParseCheckSumFile = async (packageJson, agent) => {
  const version = packageJson.version;
  const pkgName = packageJson.name;
  const repo = packageJson.repository;
  const checksumFileUrl = `https://github.com/${repo}/releases/download/v${version}/${pkgName}_${version}_checksums.txt`;

  // Fetch the checksum file
  console.info("Downloading", checksumFileUrl);
  const response = await fetch(checksumFileUrl, { agent });
  if (response.ok) {
    const checkSumContent = await response.text();
    const lines = checkSumContent.split("\n");

    const checksums = {};
    for (const line of lines) {
      const [checksum, packageName] = line.split(/\s+/);
      checksums[packageName] = checksum;
    }

    return checksums;
  } else {
    console.error(
      "Could not fetch checksum file",
      response.status,
      response.statusText
    );
  }
};

const errGlobal = `Installing Supabase CLI as a global module is not supported.
Please use one of the supported package managers: https://github.com/supabase/cli#install-the-cli
`;
const errChecksum = "Checksum mismatch. Downloaded data might be corrupted.";
const errUnsupported = `Installation is not supported for ${process.platform} ${process.arch}`;

/**
 * Reads the configuration from application's package.json,
 * downloads the binary from package url and stores at
 * ./bin in the package's root.
 *
 *  See: https://docs.npmjs.com/files/package.json#bin
 */
async function main() {
  const yarnGlobal = JSON.parse(
    process.env.npm_config_argv || "{}"
  ).original?.includes("global");
  if (process.env.npm_config_global || yarnGlobal) {
    throw errGlobal;
  }
  if (!arch || !platform) {
    throw errUnsupported;
  }

  // Read from package.json and prepare for the installation.
  const pkg = await readPackageJson();
  if (platform === "windows") {
    // Update bin path in package.json
    pkg.bin[pkg.name] += ".exe";
  }

  // Prepare the installation path by creating the directory if it doesn't exist.
  const binPath = pkg.bin[pkg.name];
  const binDir = path.dirname(binPath);
  await fs.promises.mkdir(binDir, { recursive: true });

  // Create the agent that will be used for all the fetch requests later.
  const proxyUrl =
    process.env.npm_config_https_proxy ||
    process.env.npm_config_http_proxy ||
    process.env.npm_config_proxy;
  // Keeps the TCP connection alive when sending multiple requests
  // Ref: https://github.com/node-fetch/node-fetch/issues/1735
  const agent = proxyUrl
    ? new HttpsProxyAgent(proxyUrl, { keepAlive: true })
    : new Agent({ keepAlive: true });

  // First, fetch the checksum map.
  const checksumMap = await fetchAndParseCheckSumFile(pkg, agent);

  // Then, download the binary.
  const url = getDownloadUrl(pkg);
  console.info("Downloading", url);
  const resp = await fetch(url, { agent });
  const hash = createHash("sha256");
  const pkgNameWithPlatform = `${pkg.name}_${platform}_${arch}.tar.gz`;

  // Then, decompress the binary -- we will first Un-GZip, then we will untar.
  const ungz = zlib.createGunzip();
  const binName = path.basename(binPath);
  const untar = extract({ cwd: binDir }, [binName]);

  // Update the hash with the binary data as it's being downloaded.
  resp.body
    .on("data", (chunk) => {
      hash.update(chunk);
    })
    // Pipe the data to the ungz stream.
    .pipe(ungz);

  // After the ungz stream has ended, verify the checksum.
  ungz
    .on("end", () => {
      const expectedChecksum = checksumMap?.[pkgNameWithPlatform];
      // Skip verification if we can't find the file checksum
      if (!expectedChecksum) {
        console.warn("Skipping checksum verification");
        return;
      }
      const calculatedChecksum = hash.digest("hex");
      if (calculatedChecksum !== expectedChecksum) {
        throw errChecksum;
      }
      console.info("Checksum verified.");
    })
    // Pipe the data to the untar stream.
    .pipe(untar);

  // Wait for the untar stream to finish.
  await new Promise((resolve, reject) => {
    untar.on("error", reject);
    untar.on("end", () => resolve());
  });

  // Link the binaries in postinstall to support yarn
  await binLinks({
    path: path.resolve("."),
    pkg: { ...pkg, bin: { [pkg.name]: binPath } },
  });

  console.info("Installed Supabase CLI successfully");
}

await main();
