#!/usr/bin/env bun

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const WHITEBOARD_STEP_ROLES = [
  "question",
  "premise",
  "evidence",
  "tension",
  "inference",
  "turn",
  "synthesis",
  "conclusion",
  "boundary",
] as const;

export const WHITEBOARD_LOCAL_SHAPES = ["chain", "branch", "timeline", "matrix", "radial"] as const;
export const WHITEBOARD_RELATION_KINDS = [
  "continue",
  "deepen",
  "contrast",
  "question",
  "branch",
  "return",
  "boundary",
] as const;
export const WHITEBOARD_RELATION_VISIBILITIES = ["implicit", "visible"] as const;
export const WHITEBOARD_PRESENTATIONS = [
  "text",
  "typography",
  "image",
  "chain",
  "branch",
  "timeline",
  "matrix",
  "radial",
] as const;
export const MAX_FULLPAGE_HEIGHT = 30_000;

type WhiteboardStepRole = typeof WHITEBOARD_STEP_ROLES[number];
type WhiteboardLocalShape = typeof WHITEBOARD_LOCAL_SHAPES[number];
type WhiteboardRelationKind = typeof WHITEBOARD_RELATION_KINDS[number];
type WhiteboardRelationVisibility = typeof WHITEBOARD_RELATION_VISIBILITIES[number];
type WhiteboardPresentation = typeof WHITEBOARD_PRESENTATIONS[number];

interface WhiteboardLedgerSection {
  id: string;
  disposition: "rendered" | "omitted";
  step_ids?: string[];
  omission_reason?: string;
}

interface WhiteboardLedgerStep {
  id: string;
  role: WhiteboardStepRole;
  source_refs: string[];
  claim: string;
  support: string;
  residue: string;
  must_render: true;
  presentation: WhiteboardPresentation;
}

interface WhiteboardLedgerRelation {
  id: string;
  from: string;
  to: string;
  kind: WhiteboardRelationKind;
  visibility: WhiteboardRelationVisibility;
  bridge: string;
}

interface WhiteboardLogicLedger {
  version: 2;
  source_sha256: string;
  source_sections: WhiteboardLedgerSection[];
  steps: WhiteboardLedgerStep[];
  relations: WhiteboardLedgerRelation[];
}

interface RenderedWhiteboardStep {
  id: string;
  role: string;
  sourceRefs: string[];
  claim: string;
  support: string;
  residue: string;
}

interface RenderedWhiteboardRelation {
  id: string;
  from: string;
  to: string;
  kind: string;
  visibility: string;
  bridge: string;
  ariaLabel: string;
  hasStem: boolean;
  hasArrowhead: boolean;
}

interface RenderedWhiteboardBranch {
  state: string;
  entryStep: string;
  returnStep: string;
  pathStepIds: string[][];
  hasReturnNote: boolean;
  hasOpenNote: boolean;
}

export interface WhiteboardValidationSnapshot {
  title: string;
  question: string;
  spineCount: number;
  globalLayoutCount: number;
  ledger: unknown;
  steps: RenderedWhiteboardStep[];
  relations: RenderedWhiteboardRelation[];
  branches: RenderedWhiteboardBranch[];
  localShapes: string[];
  generatedSourceClaims?: string[];
  sourceInventory?: unknown;
  sourceBytesSha256?: string;
}

export function findUnresolvedPlaceholders(source: string): string[] {
  return [...new Set(source.match(/\{\{[A-Z0-9_]+\}\}/g) ?? [])];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalized(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string" && item.trim().length > 0);
}

function sha256(bytes: Uint8Array): string {
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
}

interface WhiteboardSourceInventory {
  version: 1;
  source_sha256: string;
  section_count: number;
  sections: Array<{ id: string; text: string; text_sha256: string }>;
}

function parseSourceInventory(input: unknown, failures: string[]): WhiteboardSourceInventory | null {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (error) {
      failures.push(`Whiteboard source inventory JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.sections)) {
    failures.push("Whiteboard source inventory is missing or invalid");
    return null;
  }
  if (typeof value.source_sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(value.source_sha256)) {
    failures.push("Whiteboard source inventory SHA-256 is invalid");
    return null;
  }
  if (value.section_count !== value.sections.length || value.sections.length === 0) {
    failures.push("Whiteboard source inventory section_count mismatch");
    return null;
  }
  return value as unknown as WhiteboardSourceInventory;
}

function parseLedger(input: unknown, failures: string[]): WhiteboardLogicLedger | null {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (error) {
      failures.push(`Whiteboard logic ledger JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  if (!isRecord(value)) {
    failures.push("Whiteboard logic ledger is missing or invalid");
    return null;
  }
  if (value.version !== 2) failures.push("Whiteboard logic ledger version must be 2");
  if (typeof value.source_sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(value.source_sha256)) {
    failures.push("Whiteboard source SHA-256 is invalid");
  }
  if (!Array.isArray(value.source_sections) || value.source_sections.length === 0) {
    failures.push("Whiteboard logic ledger requires source_sections");
  }
  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    failures.push("Whiteboard logic ledger requires steps");
  }
  if (!Array.isArray(value.relations) || value.relations.length === 0) {
    failures.push("Whiteboard logic ledger requires relations");
  }
  if (failures.length > 0) return null;
  return value as unknown as WhiteboardLogicLedger;
}

function canReach(start: string, target: string, adjacency: Map<string, string[]>): boolean {
  const queue = [start];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(...(adjacency.get(current) ?? []));
  }
  return false;
}

export function validateWhiteboardSnapshot(snapshot: WhiteboardValidationSnapshot): string[] {
  const failures: string[] = [];
  if (!normalized(snapshot.title)) failures.push("Whiteboard title is missing or empty");
  if (!normalized(snapshot.question)) failures.push("Whiteboard question is missing or empty");
  if (snapshot.spineCount !== 1) {
    failures.push(`Whiteboard requires exactly one reasoning-spine; found ${snapshot.spineCount}`);
  }
  if (snapshot.globalLayoutCount !== 0) {
    failures.push("Whiteboard whole-card data-whiteboard-layout is retired; use local data-logic-shape primitives");
  }

  const ledger = parseLedger(snapshot.ledger, failures);
  if (!ledger) return failures;

  const sourceInventory = parseSourceInventory(snapshot.sourceInventory, failures);
  if (!sourceInventory) return failures;
  if (snapshot.sourceBytesSha256 !== sourceInventory.source_sha256) {
    failures.push("Whiteboard source snapshot SHA-256 differs from source inventory");
  }
  if (ledger.source_sha256 !== sourceInventory.source_sha256) {
    failures.push("Whiteboard logic ledger SHA-256 differs from source inventory");
  }

  const inventorySectionIds = sourceInventory.sections.map(section => section.id);
  if (!unique(inventorySectionIds) || inventorySectionIds.some(id => !normalized(id))) {
    failures.push("Whiteboard source inventory IDs must be non-empty and unique");
  }
  for (const section of sourceInventory.sections) {
    if (!normalized(section.text) || !/^[a-f0-9]{64}$/i.test(section.text_sha256)) {
      failures.push(`Whiteboard source inventory section ${section.id} is invalid`);
      continue;
    }
    if (sha256(new TextEncoder().encode(section.text)) !== section.text_sha256) {
      failures.push(`Whiteboard source inventory section hash mismatch: ${section.id}`);
    }
  }

  const sourceSectionIds = ledger.source_sections.map(section => section.id);
  if (!unique(sourceSectionIds) || sourceSectionIds.some(id => !normalized(id))) {
    failures.push("Whiteboard source section IDs must be non-empty and unique");
  }
  if (inventorySectionIds.join("|") !== sourceSectionIds.join("|")) {
    failures.push(`Source inventory/logic ledger section mismatch: inventory=${inventorySectionIds.join(",")} ledger=${sourceSectionIds.join(",")}`);
  }

  const ledgerStepIds = ledger.steps.map(step => step.id);
  if (!unique(ledgerStepIds) || ledgerStepIds.some(id => !normalized(id))) {
    failures.push("Whiteboard ledger step IDs must be non-empty and unique");
  }
  const ledgerStepById = new Map(ledger.steps.map(step => [step.id, step]));
  const sourceSectionSet = new Set(sourceSectionIds);

  for (const section of ledger.source_sections) {
    if (section.disposition === "rendered") {
      if (!stringArray(section.step_ids) || section.step_ids.length === 0) {
        failures.push(`Rendered source section ${section.id} requires step_ids`);
      } else {
        for (const stepId of section.step_ids) {
          if (!ledgerStepById.has(stepId)) failures.push(`Source section ${section.id} references missing step ${stepId}`);
        }
      }
      if (normalized(section.omission_reason ?? "")) {
        failures.push(`Rendered source section ${section.id} cannot carry omission_reason`);
      }
    } else if (section.disposition === "omitted") {
      if (!normalized(section.omission_reason ?? "")) {
        failures.push(`Omitted source section ${section.id} requires omission_reason`);
      }
    } else {
      failures.push(`Unsupported source section disposition: ${String(section.disposition)}`);
    }
  }

  for (const step of ledger.steps) {
    if (!WHITEBOARD_STEP_ROLES.includes(step.role)) failures.push(`Unsupported whiteboard step role: ${String(step.role)}`);
    if (!stringArray(step.source_refs)) failures.push(`Whiteboard ledger step ${step.id} missing source refs`);
    for (const sourceRef of step.source_refs ?? []) {
      if (!sourceSectionSet.has(sourceRef)) failures.push(`Whiteboard ledger step ${step.id} references unknown source section ${sourceRef}`);
    }
    if (!normalized(step.claim ?? "")) failures.push(`Whiteboard ledger step ${step.id} has empty claim`);
    if (typeof step.support !== "string") failures.push(`Whiteboard ledger step ${step.id} support must be a string`);
    if (typeof step.residue !== "string") failures.push(`Whiteboard ledger step ${step.id} residue must be a string`);
    if (step.must_render !== true) {
      failures.push(`Whiteboard final ledger step ${step.id} must_render must be true; omit sources through source_sections instead`);
    }
    if (!WHITEBOARD_PRESENTATIONS.includes(step.presentation)) {
      failures.push(`Unsupported whiteboard presentation: ${String(step.presentation)}`);
    }
  }

  if (ledger.steps[0]?.role !== "question") failures.push("Whiteboard reasoning spine must begin with a question step");
  if (!ledger.steps.some(step => step.role === "conclusion")) failures.push("Whiteboard reasoning spine requires a conclusion step");
  if (ledger.steps.at(-1)?.role !== "boundary") failures.push("Whiteboard reasoning spine must end with a boundary step");

  const renderedStepIds = snapshot.steps.map(step => step.id);
  if (!unique(renderedStepIds)) failures.push("Rendered whiteboard step IDs must be unique");
  if (ledgerStepIds.join("|") !== renderedStepIds.join("|")) {
    failures.push(`Ledger/DOM step mismatch: ledger=${ledgerStepIds.join(",")} dom=${renderedStepIds.join(",")}`);
  }

  for (const rendered of snapshot.steps) {
    const expected = ledgerStepById.get(rendered.id);
    if (!expected) continue;
    if (rendered.role !== expected.role) failures.push(`Whiteboard step ${rendered.id} role differs from ledger`);
    if (rendered.sourceRefs.length === 0) failures.push(`Whiteboard rendered step ${rendered.id} missing source refs`);
    if (rendered.sourceRefs.join("|") !== expected.source_refs.join("|")) {
      failures.push(`Whiteboard step ${rendered.id} source refs differ from ledger`);
    }
    if (normalized(rendered.claim) !== normalized(expected.claim)) failures.push(`Whiteboard step ${rendered.id} claim differs from ledger`);
    if (normalized(rendered.support) !== normalized(expected.support)) failures.push(`Whiteboard step ${rendered.id} support differs from ledger`);
    if (normalized(rendered.residue) !== normalized(expected.residue)) failures.push(`Whiteboard step ${rendered.id} residue differs from ledger`);
  }

  const ledgerRelationIds = ledger.relations.map(relation => relation.id);
  if (!unique(ledgerRelationIds) || ledgerRelationIds.some(id => !normalized(id))) {
    failures.push("Whiteboard ledger relation IDs must be non-empty and unique");
  }
  const renderedRelationIds = snapshot.relations.map(relation => relation.id);
  if (!unique(renderedRelationIds)) failures.push("Rendered whiteboard relation IDs must be unique");
  if (ledgerRelationIds.join("|") !== renderedRelationIds.join("|")) {
    failures.push(`Ledger/DOM relation mismatch: ledger=${ledgerRelationIds.join(",")} dom=${renderedRelationIds.join(",")}`);
  }

  const stepIndex = new Map(ledgerStepIds.map((id, index) => [id, index]));
  const adjacency = new Map<string, string[]>();
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const renderedRelationById = new Map(snapshot.relations.map(relation => [relation.id, relation]));

  for (const relation of ledger.relations) {
    const rendered = renderedRelationById.get(relation.id);
    if (!stepIndex.has(relation.from) || !stepIndex.has(relation.to)) {
      failures.push(`Relation endpoint not found: ${relation.id} ${relation.from} -> ${relation.to}`);
      continue;
    }
    if (relation.from === relation.to) failures.push(`Whiteboard relation ${relation.id} cannot point to itself`);
    if ((stepIndex.get(relation.from) ?? 0) >= (stepIndex.get(relation.to) ?? 0)) {
      failures.push(`Whiteboard relation ${relation.id} must move downward through ledger order`);
    }
    if (!WHITEBOARD_RELATION_KINDS.includes(relation.kind)) {
      failures.push(`Unsupported whiteboard relation kind: ${String(relation.kind)}`);
    }
    if (!WHITEBOARD_RELATION_VISIBILITIES.includes(relation.visibility)) {
      failures.push(`Unsupported whiteboard relation visibility: ${String(relation.visibility)}`);
    }
    if (typeof relation.bridge !== "string") {
      failures.push(`Whiteboard relation ${relation.id} bridge must be a string`);
    } else if (relation.visibility === "implicit" && normalized(relation.bridge)) {
      failures.push(`Whiteboard implicit relation ${relation.id} must keep bridge empty`);
    } else if (relation.visibility === "visible" && !normalized(relation.bridge)) {
      failures.push(`Whiteboard visible relation ${relation.id} requires one bridge sentence`);
    }
    if (relation.visibility === "visible" && normalized(ledgerStepById.get(relation.from)?.residue ?? "")) {
      failures.push(`Whiteboard relation ${relation.id} duplicates the visible transition already carried by ${relation.from} residue`);
    }
    adjacency.set(relation.from, [...(adjacency.get(relation.from) ?? []), relation.to]);
    incoming.set(relation.to, (incoming.get(relation.to) ?? 0) + 1);
    outgoing.set(relation.from, (outgoing.get(relation.from) ?? 0) + 1);

    if (!rendered) continue;
    if (rendered.from !== relation.from || rendered.to !== relation.to) {
      failures.push(`Whiteboard relation ${relation.id} endpoints differ from ledger`);
    }
    if (rendered.kind !== relation.kind || rendered.visibility !== relation.visibility) {
      failures.push(`Whiteboard relation ${relation.id} kind or visibility differs from ledger`);
    }
    if (normalized(rendered.bridge) !== normalized(relation.bridge)) {
      failures.push(`Whiteboard relation ${relation.id} bridge differs from ledger`);
    }
    if (relation.visibility === "visible") {
      if (!rendered.hasStem || !rendered.hasArrowhead) {
        failures.push(`Whiteboard visible relation ${relation.id} requires real DOM relation-stem and relation-arrowhead`);
      }
      if (normalized(rendered.ariaLabel) !== normalized(rendered.bridge)) {
        failures.push(`Whiteboard visible relation ${relation.id} aria-label must equal its bridge sentence`);
      }
    } else {
      if (rendered.hasStem || rendered.hasArrowhead || normalized(rendered.ariaLabel)) {
        failures.push(`Whiteboard implicit relation ${relation.id} must remain visually and accessibly silent`);
      }
    }
  }

  const firstStepId = ledgerStepIds[0] ?? "";
  const boundaryStepId = ledgerStepIds.at(-1) ?? "";
  for (const stepId of ledgerStepIds.slice(1)) {
    if ((incoming.get(stepId) ?? 0) === 0) failures.push(`Whiteboard step ${stepId} is not connected from an earlier step`);
  }
  for (const stepId of ledgerStepIds.slice(0, -1)) {
    if ((outgoing.get(stepId) ?? 0) === 0) failures.push(`Whiteboard step ${stepId} has no downward relation`);
  }
  for (const stepId of ledgerStepIds) {
    if (!canReach(firstStepId, stepId, adjacency)) failures.push(`Whiteboard step ${stepId} is unreachable from the opening question`);
  }
  if (boundaryStepId && !canReach(firstStepId, boundaryStepId, adjacency)) {
    failures.push("Whiteboard boundary is unreachable from the opening question");
  }

  for (const shape of snapshot.localShapes) {
    if (!WHITEBOARD_LOCAL_SHAPES.includes(shape as WhiteboardLocalShape)) {
      failures.push(`Unsupported local whiteboard shape: ${shape || "(empty)"}`);
    }
  }

  for (const branch of snapshot.branches) {
    if (!snapshot.localShapes.includes("branch")) failures.push("Whiteboard branch is missing data-logic-shape=branch");
    if (!stepIndex.has(branch.entryStep)) failures.push(`Whiteboard branch entry step not found: ${branch.entryStep}`);
    if (branch.pathStepIds.length < 2 || branch.pathStepIds.some(path => path.length === 0)) {
      failures.push("Whiteboard branch requires at least two non-empty paths");
    }
    for (const path of branch.pathStepIds) {
      for (const stepId of path) {
        if (!stepIndex.has(stepId)) failures.push(`Whiteboard branch path step not found: ${stepId}`);
        if (stepIndex.has(branch.entryStep) && !canReach(branch.entryStep, stepId, adjacency)) {
          failures.push(`Whiteboard branch path ${stepId} is unreachable from entry ${branch.entryStep}`);
        }
      }
    }
    if (branch.state === "converged") {
      if (!branch.hasReturnNote || !stepIndex.has(branch.returnStep)) {
        failures.push("Whiteboard converged branch must return to a real spine step with a visible branch-return note");
      } else {
        for (const path of branch.pathStepIds) {
          const end = path.at(-1)!;
          if (!canReach(end, branch.returnStep, adjacency)) {
            failures.push(`Whiteboard converged branch path ${end} does not reach return step ${branch.returnStep}`);
          }
        }
      }
    } else if (branch.state === "open") {
      if (!branch.hasOpenNote) failures.push("Whiteboard open branch requires a visible branch-open note");
    } else {
      failures.push(`Unsupported whiteboard branch state: ${branch.state || "(empty)"}`);
    }
  }

  for (const sourceClaim of snapshot.generatedSourceClaims ?? []) {
    if (!stepIndex.has(sourceClaim)) {
      failures.push(`Generated whiteboard asset source claim is not a rendered ledger step: ${sourceClaim}`);
    }
  }

  return failures;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const htmlPath = args[0];
  const outputPath = args[1];
  const width = Number.parseInt(args[2] ?? "", 10) || 1200;
  const height = Number.parseInt(args[3] ?? "", 10) || 1600;
  const fullpage = args[4] === "fullpage";
  const whiteboardInventoryPath = args[5];
  const whiteboardSourcePath = args[6];

  if (!htmlPath || !outputPath) {
    console.error("Usage: bun assets/capture.ts <html> <png> [width] [height] [fullpage] [whiteboard-source-inventory.json] [whiteboard-source.txt]");
    process.exit(1);
  }

  const resolvedHtml = resolve(htmlPath);
  const logoUrl = pathToFileURL(resolve(import.meta.dir, "logo.png")).href;
  let content = await Bun.file(resolvedHtml).text();

  if (content.includes("{{LOGO}}")) {
    content = content.replaceAll("{{LOGO}}", logoUrl);
    await Bun.write(resolvedHtml, content);
  }

  const unresolved = findUnresolvedPlaceholders(content);
  if (unresolved.length > 0) {
    throw new Error(`Unreplaced placeholders: ${unresolved.join(", ")}`);
  }

  const isWhiteboard = /data-card-mode=["']whiteboard["']/.test(content);
  let sourceInventoryText: string | undefined;
  let sourceBytesSha256: string | undefined;
  if (isWhiteboard) {
    if (!whiteboardInventoryPath || !whiteboardSourcePath) {
      throw new Error("Whiteboard capture requires source inventory and exact source snapshot paths");
    }
    const inventoryFile = Bun.file(resolve(whiteboardInventoryPath));
    const sourceFile = Bun.file(resolve(whiteboardSourcePath));
    if (!await inventoryFile.exists()) throw new Error(`Whiteboard source inventory not found: ${resolve(whiteboardInventoryPath)}`);
    if (!await sourceFile.exists()) throw new Error(`Whiteboard source snapshot not found: ${resolve(whiteboardSourcePath)}`);
    sourceInventoryText = await inventoryFile.text();
    sourceBytesSha256 = sha256(new Uint8Array(await sourceFile.arrayBuffer()));
  }

  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright not found. Run: bun install && bunx playwright install chromium");
    process.exit(1);
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height: fullpage ? 800 : height });
    await page.goto(pathToFileURL(resolvedHtml).href, { waitUntil: "networkidle" });

    const pageValidation = await page.evaluate(async ({ expectedWidth, maxFullpageHeight }) => {
      if (document.fonts?.ready) await document.fonts.ready;
      const failures: string[] = [];
      const images = Array.from(document.images).filter(image => !image.closest('[data-state="empty"]'));

      await Promise.all(images.map(image => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolveImage, rejectImage) => {
          image.addEventListener("load", () => resolveImage(), { once: true });
          image.addEventListener("error", () => rejectImage(new Error(`Image failed: ${image.src}`)), { once: true });
        });
      }));

      const broken = images.filter(image => !image.complete || image.naturalWidth === 0);
      if (broken.length > 0) failures.push(`Broken images: ${broken.map(image => image.src).join(", ")}`);

      const missingAlt = images.filter(image => {
        if (image.closest(".author, .who")) return false;
        return !image.alt.trim();
      });
      if (missingAlt.length > 0) failures.push(`Missing semantic alt: ${missingAlt.map(image => image.src).join(", ")}`);

      let whiteboard: WhiteboardValidationSnapshot | null = null;
      if (document.body.getAttribute("data-card-mode") === "whiteboard") {
        const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        if (documentWidth > expectedWidth + 1) {
          failures.push(`Horizontal overflow: document width ${documentWidth}px exceeds ${expectedWidth}px`);
        }

        const bodyHeight = document.body.scrollHeight;
        if (bodyHeight > maxFullpageHeight) {
          failures.push(`Full-page height ${bodyHeight}px exceeds supported ${maxFullpageHeight}px`);
        }

        const clippedSelectors = [
          ".whiteboard-content",
          ".whiteboard-header",
          ".reasoning-spine",
          ".logic-step",
          ".step-panel",
          ".step-residue",
          ".logic-relation",
          ".transition-sentence",
          ".local-shape",
          ".branch-path",
          ".whiteboard-boundary",
          ".colophon",
          ".info-source",
        ];
        for (const selector of clippedSelectors) {
          for (const element of document.querySelectorAll<HTMLElement>(selector)) {
            const style = getComputedStyle(element);
            const clipsX = ["hidden", "clip"].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
            const clipsY = ["hidden", "clip"].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
            if (clipsX || clipsY) {
              failures.push(`Clipped content: ${selector} scroll=${element.scrollWidth}x${element.scrollHeight} client=${element.clientWidth}x${element.clientHeight}`);
            }
          }
        }

        const generatedAssets = Array.from(document.querySelectorAll<HTMLElement>('[data-asset-kind="generated"]'))
          .filter(element => element.dataset.state !== "empty");
        if (generatedAssets.length > 4) failures.push(`Generated whiteboard assets exceed 4: ${generatedAssets.length}`);
        for (const asset of generatedAssets) {
          if (!asset.dataset.sourceClaim?.trim()) failures.push("Generated whiteboard asset missing data-source-claim");
          const image = asset.querySelector<HTMLImageElement>("img");
          if (image && !image.src.startsWith("file:") && !image.src.startsWith("data:")) {
            failures.push(`Generated whiteboard asset must use a local source: ${image.src}`);
          }
        }

        const ledgerElement = document.querySelector<HTMLScriptElement>('#whiteboard-logic-ledger[type="application/json"]');
        whiteboard = {
          title: document.querySelector<HTMLElement>(".whiteboard-title")?.innerText ?? "",
          question: document.querySelector<HTMLElement>(".whiteboard-question")?.innerText ?? "",
          spineCount: document.querySelectorAll(".reasoning-spine").length,
          globalLayoutCount: document.querySelectorAll("[data-whiteboard-layout]").length,
          ledger: ledgerElement?.textContent ?? null,
          steps: Array.from(document.querySelectorAll<HTMLElement>(".reasoning-spine .logic-step[data-step-id]")).map(step => ({
            id: step.dataset.stepId?.trim() ?? "",
            role: step.dataset.role?.trim() ?? "",
            sourceRefs: (step.dataset.sourceRefs ?? "").split(/\s+/).filter(Boolean),
            claim: step.querySelector<HTMLElement>(".step-claim")?.innerText ?? "",
            support: step.querySelector<HTMLElement>(".step-support")?.innerText ?? "",
            residue: step.querySelector<HTMLElement>(".step-residue")?.innerText ?? "",
          })),
          relations: Array.from(document.querySelectorAll<HTMLElement>(".reasoning-spine .logic-relation[data-relation-id]")).map(relation => ({
            id: relation.dataset.relationId?.trim() ?? "",
            from: relation.dataset.from?.trim() ?? "",
            to: relation.dataset.to?.trim() ?? "",
            kind: relation.dataset.kind?.trim() ?? "",
            visibility: relation.dataset.visibility?.trim() ?? "",
            bridge: relation.querySelector<HTMLElement>(".transition-sentence")?.innerText ?? "",
            ariaLabel: relation.getAttribute("aria-label")?.trim() ?? "",
            hasStem: Boolean(relation.querySelector(".relation-stem")),
            hasArrowhead: Boolean(relation.querySelector(".relation-arrowhead")),
          })),
          branches: Array.from(document.querySelectorAll<HTMLElement>('.local-branch[data-logic-shape="branch"]')).map(branch => ({
            state: branch.dataset.branchState?.trim() ?? "",
            entryStep: branch.dataset.entryStep?.trim() ?? "",
            returnStep: branch.dataset.returnStep?.trim() ?? "",
            pathStepIds: Array.from(branch.querySelectorAll<HTMLElement>(".branch-path")).map(path =>
              Array.from(path.querySelectorAll<HTMLElement>(".logic-step[data-step-id]"))
                .map(step => step.dataset.stepId?.trim() ?? "")
                .filter(Boolean),
            ),
            hasReturnNote: Boolean(branch.querySelector(".branch-return")),
            hasOpenNote: Boolean(branch.querySelector(".branch-open")),
          })),
          localShapes: Array.from(document.querySelectorAll<HTMLElement>("[data-logic-shape]"))
            .map(shape => shape.dataset.logicShape?.trim() ?? ""),
          generatedSourceClaims: generatedAssets.map(asset => asset.dataset.sourceClaim?.trim() ?? "").filter(Boolean),
        };
      }

      return { failures, whiteboard };
    }, { expectedWidth: width, maxFullpageHeight: MAX_FULLPAGE_HEIGHT });

    const validationFailures = [...pageValidation.failures];
    if (pageValidation.whiteboard) {
      pageValidation.whiteboard.sourceInventory = sourceInventoryText;
      pageValidation.whiteboard.sourceBytesSha256 = sourceBytesSha256;
      validationFailures.push(...validateWhiteboardSnapshot(pageValidation.whiteboard));
    }
    if (validationFailures.length > 0) throw new Error(validationFailures.join("\n"));

    await page.waitForTimeout(300);

    if (fullpage) {
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.setViewportSize({ width, height: bodyHeight });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: resolve(outputPath),
        type: "png",
        clip: { x: 0, y: 0, width, height: bodyHeight },
      });
    } else {
      await page.screenshot({
        path: resolve(outputPath),
        type: "png",
        clip: { x: 0, y: 0, width, height },
      });
    }
  } finally {
    await browser.close();
  }

  console.log(`OK: ${resolve(outputPath)}`);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
