#!/usr/bin/env bun

import { resolve } from "node:path";

export interface WhiteboardSourceInventory {
  version: 1;
  source_sha256: string;
  section_count: number;
  sections: Array<{
    id: string;
    text: string;
    text_sha256: string;
  }>;
}

function sha256(bytes: Uint8Array): string {
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
}

export function buildWhiteboardSourceInventory(sourceBytes: Uint8Array): WhiteboardSourceInventory {
  const source = new TextDecoder().decode(sourceBytes).replace(/\r\n?/g, "\n");
  const paragraphs = source
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length === 0) throw new Error("Whiteboard source contains no readable paragraphs");

  const idWidth = Math.max(2, String(paragraphs.length).length);
  const sections = paragraphs.map((text, index) => ({
    id: `src-${String(index + 1).padStart(idWidth, "0")}`,
    text,
    text_sha256: sha256(new TextEncoder().encode(text)),
  }));

  return {
    version: 1,
    source_sha256: sha256(sourceBytes),
    section_count: sections.length,
    sections,
  };
}

async function main(): Promise<void> {
  const sourcePath = process.argv[2];
  const outputPath = process.argv[3];
  if (!sourcePath || !outputPath) {
    console.error("Usage: bun assets/prepare-whiteboard-source.ts <source.txt> <source-inventory.json>");
    process.exit(1);
  }

  const resolvedSource = resolve(sourcePath);
  const resolvedOutput = resolve(outputPath);
  const sourceBytes = new Uint8Array(await Bun.file(resolvedSource).arrayBuffer());
  const inventory = buildWhiteboardSourceInventory(sourceBytes);
  await Bun.write(resolvedOutput, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(JSON.stringify({
    status: "pass",
    source: resolvedSource,
    output: resolvedOutput,
    source_sha256: inventory.source_sha256,
    section_count: inventory.section_count,
  }, null, 2));
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
