#!/usr/bin/env bun

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const htmlPath = args[0];
  const outputPath = args[1];
  const width = Number.parseInt(args[2] ?? "", 10) || 1200;
  const height = Number.parseInt(args[3] ?? "", 10) || 1600;
  const fullpage = args[4] === "fullpage";

  if (!htmlPath || !outputPath) {
    console.error("Usage: bun assets/capture.ts <html> <png> [width] [height] [fullpage]");
    process.exit(1);
  }

  const resolvedHtml = resolve(htmlPath);
  const logoUrl = pathToFileURL(resolve(import.meta.dir, "logo.png")).href;
  let content = await Bun.file(resolvedHtml).text();

  if (content.includes("{{LOGO}}")) {
    content = content.replaceAll("{{LOGO}}", logoUrl);
    await Bun.write(resolvedHtml, content);
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

    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      const images = Array.from(document.images).filter(
        image => !image.closest('[data-state="empty"]'),
      );

      await Promise.all(images.map(image => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolveImage, rejectImage) => {
          image.addEventListener("load", () => resolveImage(), { once: true });
          image.addEventListener(
            "error",
            () => rejectImage(new Error(`Image failed: ${image.src}`)),
            { once: true },
          );
        });
      }));

      const broken = images.filter(image => !image.complete || image.naturalWidth === 0);
      if (broken.length > 0) {
        throw new Error(`Broken images: ${broken.map(image => image.src).join(", ")}`);
      }

      const missingAlt = images.filter(image => {
        if (image.closest(".author, .who")) return false;
        return !image.alt.trim();
      });
      if (missingAlt.length > 0) {
        throw new Error(`Missing semantic alt: ${missingAlt.map(image => image.src).join(", ")}`);
      }
    });

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

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
