import { readFileSync, writeFileSync } from "node:fs";
const root = JSON.parse(readFileSync("package.json", "utf8"));
const packages = Object.entries({
  ...root.dependencies,
  ...root.devDependencies,
}).map(([name, version]) => {
  const metadata = JSON.parse(
    readFileSync(`node_modules/${name}/package.json`, "utf8"),
  );
  return {
    name,
    version,
    kind: root.dependencies[name] ? "runtime" : "development",
    license: metadata.license,
    engines: metadata.engines,
    peerDependencies: metadata.peerDependencies,
  };
});
writeFileSync(
  "docs/research/implementation-dependency-evidence.json",
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      localRuntime: process.version,
      targetRuntime: "Node24",
      overrides: root.overrides,
      packages,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Recorded ${packages.length} direct installed package metadata entries.`,
);
