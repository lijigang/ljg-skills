#!/usr/bin/env bun

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface FullTextBlock {
  id: string;
  text: string;
}

interface FullTextLedger {
  version: 1;
  source_sha256: string;
  blocks: FullTextBlock[];
}

interface DomReadback {
  blocks: FullTextBlock[];
  nestedIds: string[];
  strayCharacterCount: number;
}

export interface FullTextReport {
  status: "pass" | "fail";
  expected_blocks: number;
  actual_blocks: number;
  source_sha256: string;
  failures: string[];
}

function sha256Bytes(bytes: Uint8Array): string {
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
}

function sha256Text(value: string): string {
  return sha256Bytes(new TextEncoder().encode(value));
}

function duplicateIds(blocks: FullTextBlock[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const block of blocks) {
    if (seen.has(block.id)) duplicates.add(block.id);
    seen.add(block.id);
  }
  return [...duplicates];
}

export function compareBlockLedgers(
  expected: FullTextBlock[],
  actual: FullTextBlock[],
): string[] {
  const failures: string[] = [];
  const expectedDuplicates = duplicateIds(expected);
  const actualDuplicates = duplicateIds(actual);

  if (expectedDuplicates.length > 0) {
    failures.push(`ledger has duplicate ids: ${expectedDuplicates.join(", ")}`);
  }
  if (actualDuplicates.length > 0) {
    failures.push(`document has duplicate ids: ${actualDuplicates.join(", ")}`);
  }
  if (expected.length !== actual.length) {
    failures.push(`block count mismatch: expected=${expected.length} actual=${actual.length}`);
  }

  const length = Math.max(expected.length, actual.length);
  for (let index = 0; index < length; index += 1) {
    const expectedBlock = expected[index];
    const actualBlock = actual[index];
    if (!expectedBlock || !actualBlock) continue;

    if (expectedBlock.id !== actualBlock.id) {
      failures.push(
        `block order/id mismatch at position ${index + 1}: expected=${expectedBlock.id} actual=${actualBlock.id}`,
      );
      continue;
    }

    if (expectedBlock.text !== actualBlock.text) {
      failures.push(
        `text mismatch at ${expectedBlock.id}: expected_sha256=${sha256Text(expectedBlock.text)} actual_sha256=${sha256Text(actualBlock.text)}`,
      );
    }
  }

  return failures;
}

async function readLedger(path: string): Promise<FullTextLedger> {
  const raw = await Bun.file(path).json() as Partial<FullTextLedger>;
  if (raw.version !== 1) throw new Error("ledger version must be 1");
  if (!/^[a-f0-9]{64}$/.test(raw.source_sha256 ?? "")) {
    throw new Error("ledger source_sha256 must be 64 lowercase hex characters");
  }
  if (!Array.isArray(raw.blocks) || raw.blocks.length === 0) {
    throw new Error("ledger blocks must be a non-empty array");
  }

  const blocks = raw.blocks.map((block, index) => {
    if (!block || typeof block.id !== "string" || !/^b\d{3,}$/.test(block.id)) {
      throw new Error(`invalid block id at position ${index + 1}`);
    }
    if (typeof block.text !== "string" || block.text.length === 0) {
      throw new Error(`invalid block text at ${block.id}`);
    }
    return { id: block.id, text: block.text };
  });

  return {
    version: 1,
    source_sha256: raw.source_sha256!,
    blocks,
  };
}

async function readDom(htmlPath: string): Promise<DomReadback> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(resolve(htmlPath)).href, { waitUntil: "load" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    return await page.evaluate(() => {
      const root = document.querySelector(".full-document");
      if (!root) throw new Error("missing .full-document root");

      const elements = Array.from(root.querySelectorAll("[data-source-block]"));
      const nestedIds = elements
        .filter(element => element.querySelector("[data-source-block]"))
        .map(element => element.getAttribute("data-source-block") ?? "<missing>");
      const blocks = elements.map(element => ({
        id: element.getAttribute("data-source-block") ?? "",
        text: element.textContent ?? "",
      }));

      const structuralClone = root.cloneNode(true) as Element;
      for (const element of structuralClone.querySelectorAll("[data-source-block]")) {
        element.remove();
      }
      const strayCharacterCount = (structuralClone.textContent ?? "").replace(/\s+/gu, "").length;

      return { blocks, nestedIds, strayCharacterCount };
    });
  } finally {
    await browser.close();
  }
}

export async function verifyFullText(
  ledgerPath: string,
  htmlPath: string,
  sourcePath: string,
): Promise<FullTextReport> {
  const ledger = await readLedger(resolve(ledgerPath));
  const sourceBytes = new Uint8Array(await Bun.file(resolve(sourcePath)).arrayBuffer());
  const actualSourceHash = sha256Bytes(sourceBytes);
  const dom = await readDom(resolve(htmlPath));
  const failures = compareBlockLedgers(ledger.blocks, dom.blocks);

  if (actualSourceHash !== ledger.source_sha256) {
    failures.unshift(
      `source SHA-256 mismatch: expected=${ledger.source_sha256} actual=${actualSourceHash}`,
    );
  }
  if (dom.nestedIds.length > 0) {
    failures.push(`nested data-source-block elements: ${dom.nestedIds.join(", ")}`);
  }
  if (dom.strayCharacterCount > 0) {
    failures.push(
      `unregistered visible text remains inside .full-document: characters=${dom.strayCharacterCount}`,
    );
  }

  return {
    status: failures.length === 0 ? "pass" : "fail",
    expected_blocks: ledger.blocks.length,
    actual_blocks: dom.blocks.length,
    source_sha256: actualSourceHash,
    failures,
  };
}

async function main(): Promise<void> {
  const [ledgerPath, htmlPath, sourcePath] = process.argv.slice(2);
  if (!ledgerPath || !htmlPath || !sourcePath) {
    console.error(
      "Usage: bun assets/verify-full-text.ts <source-ledger.json> <full.html> <source-file>",
    );
    process.exit(1);
  }

  const report = await verifyFullText(ledgerPath, htmlPath, sourcePath);
  console.log(JSON.stringify(report, null, 2));
  if (report.status === "fail") process.exit(1);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
