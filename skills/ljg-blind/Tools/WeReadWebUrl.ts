#!/usr/bin/env bun

import { CryptoHasher } from "bun";

function md5(value: string): string {
  return new CryptoHasher("md5").update(value).digest("hex");
}

function encodePayload(value: string): ["3" | "4", string[]] {
  if (/^\d*$/.test(value)) {
    const chunks: string[] = [];
    for (let offset = 0; offset < value.length; offset += 9) {
      const chunk = value.slice(offset, offset + 9);
      chunks.push(Number.parseInt(chunk, 10).toString(16));
    }
    return ["3", chunks];
  }

  let encoded = "";
  for (let index = 0; index < value.length; index += 1) {
    encoded += value.charCodeAt(index).toString(16);
  }
  return ["4", [encoded]];
}

export function encodeWeReadId(value: string): string {
  if (!value) {
    throw new Error("WeRead ID must not be empty");
  }

  const digest = md5(value);
  const [kind, chunks] = encodePayload(value);
  let encoded = `${digest.slice(0, 3)}${kind}2${digest.slice(-2)}`;

  encoded += chunks
    .map((chunk) => `${chunk.length.toString(16).padStart(2, "0")}${chunk}`)
    .join("g");

  if (encoded.length < 20) {
    encoded += digest.slice(0, 20 - encoded.length);
  }

  return `${encoded}${md5(encoded).slice(0, 3)}`;
}

export function createWeReadWebUrl(bookId: string, chapterUid?: string): string {
  const readerId = chapterUid
    ? `${encodeWeReadId(bookId)}k${encodeWeReadId(chapterUid)}`
    : encodeWeReadId(bookId);

  return `https://weread.qq.com/web/reader/${readerId}`;
}

if (import.meta.main) {
  const [bookId, chapterUid] = Bun.argv.slice(2);
  if (bookId === "--help" || bookId === "-h") {
    console.log([
      "WeReadWebUrl — generate a WeRead web reader link",
      "",
      "Usage:",
      "  bun WeReadWebUrl.ts <bookId> [chapterUid]",
      "",
      "Arguments:",
      "  bookId       WeRead book ID",
      "  chapterUid   Optional WeRead chapter UID",
    ].join("\n"));
    process.exit(0);
  }

  if (!bookId) {
    console.error("Usage: bun WeReadWebUrl.ts <bookId> [chapterUid]");
    process.exit(1);
  }

  console.log(createWeReadWebUrl(bookId, chapterUid));
}
