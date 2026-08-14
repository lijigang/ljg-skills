import { readdir } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const templateNames = ["long", "comic", "whiteboard"];
const modeNames = ["long", "comic", "whiteboard"];
const failures: string[] = [];

async function text(path: string): Promise<string> {
  return Bun.file(path).text();
}

function requireThat(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

const activeFiles = [join(root, "SKILL.md")];
for (const file of await readdir(join(root, "references"))) {
  if (file.endsWith(".md")) activeFiles.push(join(root, "references", file));
}
for (const file of await readdir(join(root, "assets"))) {
  if (/\.(html|js|ts)$/.test(file)) activeFiles.push(join(root, "assets", file));
}

const vectorToken = String.fromCharCode(115, 118, 103);
const fragmentFilter = `url(${String.fromCharCode(35)}`;
const legacyPackageCommands = [
  String.fromCharCode(110, 112, 109, 32),
  String.fromCharCode(110, 112, 120, 32),
];

for (const file of activeFiles) {
  const body = await text(file);
  if (body.toLowerCase().includes(vectorToken)) failures.push(`vector token remains: ${file}`);
  if (body.toLowerCase().includes(fragmentFilter)) failures.push(`fragment filter remains: ${file}`);
  if (file.endsWith(".md") || file.endsWith("capture.ts")) {
    for (const command of legacyPackageCommands) {
      if (body.toLowerCase().includes(command)) failures.push(`legacy package command remains: ${file}`);
    }
  }
}

const skill = await text(join(root, "SKILL.md"));
requireThat(/version:\s*"\d+\.\d+\.\d+"/.test(skill), "SKILL version is not valid semver");
requireThat(skill.includes("references/image-generation.md"), "shared protocol missing from SKILL route");
requireThat(skill.includes("`-l`（默认）"), "default long mode changed");

const shared = await text(join(root, "references", "image-generation.md"));
for (const field of ["源判断", "核心冲突", "视觉动词", "承载物", "文字安全区"]) {
  requireThat(shared.includes(field), `motif field missing: ${field}`);
}
for (const term of ["系列圣经", "先样图，后批量", "No readable text", "SHA-256", "alt"]) {
  requireThat(shared.includes(term), `shared protocol term missing: ${term}`);
}

for (const mode of modeNames) {
  const body = await text(join(root, "references", `mode-${mode}.md`));
  requireThat(body.includes("references/image-generation.md"), `mode does not read shared protocol: ${mode}`);
  requireThat(body.includes("bun assets/capture.ts"), `mode capture command is not Bun: ${mode}`);
}

for (const name of templateNames) {
  const body = await text(join(root, "assets", `${name}_template.html`));
  requireThat(body.includes(`generated-visual--${name}`), `mode class missing: ${name}`);
  requireThat(body.includes('data-state="{{IMAGE_STATE}}"'), `image state slot missing: ${name}`);
  requireThat(body.includes('src="{{IMAGE_SRC}}"'), `image source slot missing: ${name}`);
  requireThat(body.includes('alt="{{IMAGE_ALT}}"'), `image alt slot missing: ${name}`);
  requireThat(body.includes('[data-state="empty"]'), `empty image hiding missing: ${name}`);
}

const routes = [...skill.matchAll(/`((?:references|assets)\/[A-Za-z0-9._-]+)`/g)].map(match => match[1]);
for (const route of routes) {
  requireThat(await Bun.file(join(root, route)).exists(), `broken SKILL route: ${route}`);
}

const result = {
  status: failures.length === 0 ? "pass" : "fail",
  files_scanned: activeFiles.length,
  templates: templateNames.length,
  modes: modeNames.length,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exit(1);
