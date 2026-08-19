import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { compareBlockLedgers, type FullTextBlock } from "./verify-full-text";

const expected: FullTextBlock[] = [
  { id: "b001", text: "原稿标题" },
  { id: "b002", text: "第一段原文，标点与空格都保留。" },
  { id: "b003", text: "最后一句。" },
];

describe("compareBlockLedgers", () => {
  test("accepts an exact ordered copy", () => {
    expect(compareBlockLedgers(expected, structuredClone(expected))).toEqual([]);
  });

  test("rejects a one-character rewrite", () => {
    const actual = structuredClone(expected);
    actual[1].text = "第一段原文，标点与空格要保留。";
    expect(compareBlockLedgers(expected, actual)).toHaveLength(1);
  });

  test("rejects reordered blocks", () => {
    const actual = [expected[0], expected[2], expected[1]];
    expect(compareBlockLedgers(expected, actual).length).toBeGreaterThan(0);
  });

  test("rejects a missing block", () => {
    expect(compareBlockLedgers(expected, expected.slice(0, 2)).length).toBeGreaterThan(0);
  });

  test("rejects a duplicated block", () => {
    const actual = [...expected, expected[2]];
    expect(compareBlockLedgers(expected, actual).length).toBeGreaterThan(0);
  });
});

describe("verify-full-text CLI", () => {
  let fixtureDir = "";
  let ledgerPath = "";
  let sourcePath = "";

  beforeAll(async () => {
    fixtureDir = await mkdtemp(join(tmpdir(), "ljg-card-full-text-test-"));
    sourcePath = join(fixtureDir, "source.txt");
    ledgerPath = join(fixtureDir, "ledger.json");
    const source = "原稿标题\n\n第一段原文。\n";
    const sourceHash = new Bun.CryptoHasher("sha256")
      .update(new TextEncoder().encode(source))
      .digest("hex");

    await Bun.write(sourcePath, source);
    await Bun.write(
      ledgerPath,
      JSON.stringify({
        version: 1,
        source_sha256: sourceHash,
        blocks: [
          { id: "b001", text: "原稿标题" },
          { id: "b002", text: "第一段原文。" },
        ],
      }),
    );

    const documents: Record<string, string> = {
      exact: '<main class="full-document"><h1 data-source-block="b001">原稿标题</h1><p data-source-block="b002">第一段原文。</p></main>',
      rewrite: '<main class="full-document"><h1 data-source-block="b001">原稿标题</h1><p data-source-block="b002">第一段改文。</p></main>',
      reordered: '<main class="full-document"><p data-source-block="b002">第一段原文。</p><h1 data-source-block="b001">原稿标题</h1></main>',
      missing: '<main class="full-document"><h1 data-source-block="b001">原稿标题</h1></main>',
      duplicated: '<main class="full-document"><h1 data-source-block="b001">原稿标题</h1><p data-source-block="b002">第一段原文。</p><p data-source-block="b002">第一段原文。</p></main>',
    };
    for (const [name, body] of Object.entries(documents)) {
      await Bun.write(join(fixtureDir, `${name}.html`), `<!DOCTYPE html><html><body>${body}</body></html>`);
    }
  });

  afterAll(async () => {
    if (fixtureDir) await rm(fixtureDir, { recursive: true, force: true });
  });

  async function exitCodeFor(name: string): Promise<number> {
    const process = Bun.spawn([
      "bun",
      join(import.meta.dir, "verify-full-text.ts"),
      ledgerPath,
      join(fixtureDir, `${name}.html`),
      sourcePath,
    ], {
      stdout: "ignore",
      stderr: "ignore",
    });
    return process.exited;
  }

  test("CLI exits 0 for exact source text", async () => {
    expect(await exitCodeFor("exact")).toBe(0);
  });

  for (const name of ["rewrite", "reordered", "missing", "duplicated"]) {
    test(`CLI exits nonzero for ${name}`, async () => {
      expect(await exitCodeFor(name)).toBe(1);
    });
  }
});
