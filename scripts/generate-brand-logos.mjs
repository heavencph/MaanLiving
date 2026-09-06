/**
 * Cuts the brand marks in public/brand — SVG with the letters as outlines, and
 * PNG at four times density — from the faces the site itself serves.
 *
 * Neither the layout nor the letterforms are reinvented here. The browser is
 * asked where it put every character, by giving each one its own span and a
 * zero-height probe beside it that reports the baseline it sat on; the
 * outlines then come from the font files next/font writes into
 * .next/static/media. So the mark is the site's own type, positioned the way
 * the site positions it, rather than a redraw that happens to look close.
 *
 * Two things this has to work around. fontkit cannot instance a variable font
 * straight out of a woff2 — the outlines come back null — so each file is
 * decompressed to TTF first, which is what makes the 840 wordmark real weight
 * rather than a synthetic one. And the CJK face is split by character range,
 * so 萬 and 角 arrive in different files; the lookup below is by character.
 *
 * Neither Playwright nor fontkit is a dependency of this project — the marks
 * are a one-off asset, not part of the build — so install them first:
 *
 *   npm i --no-save playwright fontkit wawoff2 && npx playwright install chromium
 *
 * (or set CHROMIUM_PATH to a browser that is already on the machine)
 *
 * Then, against a build of the site (`npm run build && npx next start -p 3100`):
 *
 *   node scripts/generate-brand-logos.mjs
 */
import { createRequire } from "module";
import * as fontkit from "fontkit";
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
// Type stripping means this Node script can read the site's own brand config
// rather than keeping a second copy of the name that drifts from it.
import { brand, brandFull } from "../lib/brand.ts";

const require = createRequire(import.meta.url);
const { decompress } = require("wawoff2");

const ROOT = new URL("..", import.meta.url).pathname;
const MEDIA = join(ROOT, ".next/static/media");
const OUT = join(ROOT, "public/brand");
const SITE = process.env.SITE ?? "http://localhost:3100";
const INK = "#3b2414";
const LIGHT = "#faf5e9";

/**
 * Which file carries which character, found by opening every chunk and asking
 * for the glyph rather than by trusting a filename that is a content hash.
 *
 * Family order matters and is the stack's: Inter first, the CJK face second.
 * Several of the CJK chunks also carry Latin — taking whichever file happened
 * to come back first from the directory set the Latin wordmark in Noto Sans TC, which is
 * a different alphabet drawn to a different width, and put the vector 24% off
 * the raster it was supposed to match.
 */
const carriers = new Map();
async function fontFor(ch) {
  if (carriers.has(ch)) return carriers.get(ch);
  const files = readdirSync(MEDIA).filter((f) => f.endsWith(".woff2"));
  const candidates = [];
  for (const name of files) {
    let probe;
    try {
      probe = fontkit.openSync(join(MEDIA, name));
    } catch {
      continue;
    }
    if (probe.glyphForCodePoint(ch.codePointAt(0))?.id) {
      candidates.push({ name, latin: /Inter/i.test(probe.familyName) });
    }
  }
  const pick = candidates.find((c) => c.latin) ?? candidates[0];
  if (!pick) throw new Error(`no font in ${MEDIA} carries ${ch}`);
  const ttf = Buffer.from(await decompress(readFileSync(join(MEDIA, pick.name))));
  const font = fontkit.create(ttf);
  carriers.set(ch, font);
  return font;
}

/**
 * Each character in its own span so the browser reports where it put it, and a
 * zero-height inline-block beside it reports the baseline it sat on.
 */
const measure = ({ html, colour }) => {
  document.body.style.cssText = "margin:0;display:block;background:transparent";
  document.documentElement.style.background = "transparent";
  for (const el of document.querySelectorAll("header,footer,#preloader")) el.remove();
  document.body.innerHTML = `<div id="logo" style="display:inline-flex;align-items:center;width:max-content;padding:24px;color:${colour};font-family:var(--font-body-latin),var(--font-body-tc),sans-serif;-webkit-font-smoothing:antialiased">${html}</div>`;

  const glyphs = [];
  for (const span of document.querySelectorAll("#logo span[data-ch]")) {
    const r = span.getBoundingClientRect();
    const cs = getComputedStyle(span);
    glyphs.push({
      ch: span.dataset.ch,
      x: r.left,
      baseline: span.nextElementSibling.getBoundingClientRect().top,
      size: parseFloat(cs.fontSize),
      weight: Number(cs.fontWeight),
    });
  }
  const box = document.querySelector("#logo").getBoundingClientRect();
  return { glyphs, box: { x: box.left, y: box.top, w: box.width, h: box.height } };
};

const chars = (text) =>
  [...text]
    .map((ch) =>
      ch === " "
        ? "<span>&nbsp;</span>"
        : `<span data-ch="${ch}">${ch}</span><span style="display:inline-block;width:0;height:0;vertical-align:baseline"></span>`
    )
    .join("");

// The four marks, set exactly as the site sets them.
const VARIANTS = {
  lockup: `<span style="font-size:120px;letter-spacing:0.18em;line-height:1;white-space:nowrap">${chars(brand.zh)}<span style="font-size:0.55em;letter-spacing:0.3em;vertical-align:middle;margin-left:0.34em">${chars(brand.latin)}</span></span>`,
  stacked: `<span style="display:flex;flex-direction:column;gap:0.22em;line-height:1"><span style="font-size:120px;letter-spacing:0.18em">${chars(brand.zh)}</span><span style="font-size:30px;letter-spacing:0.3em">${chars(brand.latin)}</span></span>`,
  mark: `<span style="font-size:200px;letter-spacing:0.18em;line-height:1">${chars(brand.zh)}</span>`,
  wordmark: `<span style="font-size:160px;font-weight:840;letter-spacing:-0.01em;line-height:1">${chars(brand.wordmark)}</span>`,
};

// CHROMIUM_PATH points at an already-installed browser, for a machine where
// `npx playwright install` cannot reach the download host.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const context = await browser.newContext({
  viewport: { width: 2400, height: 900 },
  deviceScaleFactor: 4,
});
const page = await context.newPage();
await page.goto(SITE, { waitUntil: "load" });
await page
  .waitForFunction(() => !document.querySelector("#preloader"), null, { timeout: 25000 })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);

mkdirSync(OUT, { recursive: true });
for (const [variant, html] of Object.entries(VARIANTS)) {
  const { glyphs, box } = await page.evaluate(measure, { html, colour: INK });

  const paths = [];
  for (const g of glyphs) {
    const font = await fontFor(g.ch);
    const id = font.glyphForCodePoint(g.ch.codePointAt(0)).id;
    const glyph = font.getVariation({ wght: g.weight }).getGlyph(id);
    const d = glyph.path.toSVG();
    if (!d) continue;
    const scale = g.size / font.unitsPerEm;
    // Font units run up from the baseline; SVG runs down from the top.
    paths.push(
      `  <path transform="translate(${(g.x - box.x).toFixed(2)} ${(g.baseline - box.y).toFixed(2)}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})" d="${d}"/>`
    );
  }

  for (const [tone, colour] of [
    ["ink", INK],
    ["light", LIGHT],
  ]) {
    writeFileSync(
      join(OUT, `${brand.slug}-${variant}-${tone}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box.w.toFixed(2)} ${box.h.toFixed(2)}" width="${box.w.toFixed(0)}" height="${box.h.toFixed(0)}" role="img" aria-label="${brandFull}">\n<title>${brandFull}</title>\n<g fill="${colour}">\n${paths.join("\n")}\n</g>\n</svg>\n`
    );
    // The PNG comes off the same markup, so the two cannot drift apart.
    await page.evaluate(measure, { html, colour });
    const el = await page.$("#logo");
    await el.screenshot({ path: join(OUT, `${brand.slug}-${variant}-${tone}.png`), omitBackground: true });
  }
  console.log(`${variant.padEnd(10)} ${paths.length} outlines  ${box.w.toFixed(0)}x${box.h.toFixed(0)}`);
}
await browser.close();
