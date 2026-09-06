/**
 * Cuts the tab and home-screen icons in app/ — icon.png, apple-icon.png and
 * favicon.ico — from the same face the site sets its name in.
 *
 * A favicon is 16 pixels wide in the place it matters most, which rules out
 * the lockup: four Latin letters or three ideographs are a smudge at that
 * size. One character is the whole design, and it is the first of the Chinese
 * name, set in the site's own CJK face on the site's own paper colour.
 *
 * The circle is drawn rather than cropped so the PNG keeps a transparent
 * corner: Safari puts the apple-icon on its own ground, and a square of paper
 * there would sit in a box of the wrong colour.
 *
 * Needs a build of the site running, so the browser has the real webfont:
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *   npm run build && npx next start -p 3100
 *   node scripts/generate-brand-icons.mjs
 *
 * (CHROMIUM_PATH points at an already-installed browser where that download
 * cannot be reached.)
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { join } from "path";
import { brand } from "../lib/brand.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const SITE = process.env.SITE ?? "http://localhost:3100";
const PAPER = "#faf5e9";
const INK = "#3b2414";
const GLYPH = [...brand.zh][0];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
await page.goto(SITE, { waitUntil: "load" });
await page.waitForFunction(() => !document.querySelector("#preloader"), null, { timeout: 30000 })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready.catch(() => {}));

async function icon(size) {
  await page.evaluate(({ size, PAPER, INK, GLYPH }) => {
    const stack = getComputedStyle(document.body).fontFamily;
    document.getElementById("icon")?.remove();
    // The page is only here to have fetched the webfont; nothing of it belongs
    // in the icon. Hidden rather than removed, so the font stays loaded — and
    // the two backgrounds cleared as well, because the body's paints the
    // canvas behind everything and `visibility` does not stop that.
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.visibility = "hidden";
    const el = document.createElement("div");
    el.id = "icon";
    el.style.cssText = `position:fixed;left:0;top:0;z-index:99999;visibility:visible;
      width:${size}px;height:${size}px;
      border-radius:50%;background:${PAPER};color:${INK};display:flex;align-items:center;
      justify-content:center;font-family:${stack};font-weight:500;line-height:1;
      font-size:${Math.round(size * 0.62)}px`;
    // The optical centre of an ideograph sits a little above the box's centre,
    // because the face leaves more room below the em than above it.
    el.innerHTML = `<span style="display:block;transform:translateY(-${size * 0.015}px)">${GLYPH}</span>`;
    document.body.appendChild(el);
  }, { size, PAPER, INK, GLYPH });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return page.locator("#icon").screenshot({ omitBackground: true });
}

writeFileSync(join(ROOT, "app/icon.png"), await icon(512));
writeFileSync(join(ROOT, "app/apple-icon.png"), await icon(180));

// An .ico is a directory of images; every browser that matters reads PNG
// entries, so the three sizes go in as PNGs rather than as bitmaps.
const sizes = [16, 32, 48];
const imgs = [];
for (const s of sizes) imgs.push(await icon(s));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const at = 6 + 16 * i;
  header.writeUInt8(s === 256 ? 0 : s, at);
  header.writeUInt8(s === 256 ? 0 : s, at + 1);
  header.writeUInt8(0, at + 2);
  header.writeUInt8(0, at + 3);
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(imgs[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += imgs[i].length;
});
writeFileSync(join(ROOT, "app/favicon.ico"), Buffer.concat([header, ...imgs]));

await browser.close();
console.log(`icon.png 512  apple-icon.png 180  favicon.ico ${sizes.join("/")}   glyph ${GLYPH}`);
