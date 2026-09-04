#!/usr/bin/env node
/**
 * Convert bundled raster assets to WebP and repoint the imports.
 *
 * §2.6 of docs/seo-strategy.md: page weight is the dominant cost lever above
 * ~1.2M pageviews/month, ~96% of it is static build assets, and the fix is
 * build-time — not a runtime image service.
 *
 * This converts at the *source* rather than in a Vite plugin, deliberately.
 * These are marketing assets that change a few times a year, so re-encoding all
 * of them on every CI build would burn deploy time producing byte-identical
 * output. Converting once puts the result in the diff where it can be reviewed,
 * and keeps a native encoder out of the build's critical path. Re-running is a
 * no-op, so it stays usable when someone adds an image.
 *
 * Dimensions are preserved. Downscaling needs the display size of each specific
 * asset, which is a per-image judgement this script has no basis to make — it
 * reports oversized candidates instead of guessing. The one exception already
 * made by hand was the four contributor portraits, whose 80px display size was
 * verified against the markup first.
 *
 * SVGs are out of scope here — `logo-white.svg` was optimised separately with
 * `npx svgo --multipass --precision=1`, verified at its 16px display size.
 *
 *   node scripts/optimize-images.js [--dry]
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const DRY = process.argv.includes("--dry");
const ROOTS = ["src/images", "src/assets"];
const CODE_EXT = /\.(jsx?|tsx?|css|html)$/;
const RASTER = /\.(png|jpe?g)$/i;

// Anything wider than this is larger than any plausible display slot on the
// site even allowing for a 2x retina full-bleed hero. Reported, never acted on.
const OVERSIZED_WIDTH = 2000;

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function main() {
  const sourceFiles = walk("src").filter((f) => CODE_EXT.test(f));
  const images = ROOTS.flatMap((r) => walk(r)).filter((f) => RASTER.test(f));

  if (!images.length) {
    console.log("No raster assets left to convert.");
    return;
  }

  // Only convert what something actually imports. Unreferenced files are not
  // bundled by Vite, so converting them changes the repo without changing a
  // single byte of what ships.
  const code = sourceFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const isReferenced = (file) => {
    const base = path.basename(file);
    // Boundary-anchored: a plain substring test counts "on-the-go.jpg" as used
    // because "crypto-on-the-go.jpg" contains it.
    const re = new RegExp("[\"'`/(]" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return re.test(code);
  };

  const referenced = images.filter(isReferenced);
  const orphans = images.filter((f) => !isReferenced(f));

  const results = [];
  const oversized = [];

  for (const file of referenced) {
    const before = fs.statSync(file).size;
    const meta = await sharp(file).metadata();
    const target = file.replace(RASTER, ".webp");

    // PNG sources are usually UI screenshots and line art, where banding shows
    // at the quality that flatters a photograph.
    const quality = path.extname(file).toLowerCase() === ".png" ? 88 : 80;
    const buf = await sharp(file).webp({ quality, effort: 6 }).toBuffer();

    // A conversion that makes the file bigger is not an optimisation. Small,
    // already-tight PNGs can land here.
    if (buf.length >= before) {
      results.push({ file, before, after: before, skipped: true });
      continue;
    }

    if (!DRY) {
      fs.writeFileSync(target, buf);
      fs.unlinkSync(file);
    }
    results.push({ file, target, before, after: buf.length });
    if (meta.width > OVERSIZED_WIDTH) {
      oversized.push({ file: target, width: meta.width, height: meta.height });
    }
  }

  // Repoint every import and url() at the new extension.
  let rewritten = 0;
  if (!DRY) {
    for (const src of sourceFiles) {
      const original = fs.readFileSync(src, "utf8");
      let updated = original;
      for (const { file, target } of results) {
        if (!target) continue;
        updated = updated.split(path.basename(file)).join(path.basename(target));
      }
      if (updated !== original) {
        fs.writeFileSync(src, updated);
        rewritten += 1;
      }
    }
  }

  const converted = results.filter((r) => !r.skipped);
  const before = converted.reduce((a, r) => a + r.before, 0);
  const after = converted.reduce((a, r) => a + r.after, 0);

  converted
    .sort((a, b) => b.before - a.before)
    .forEach((r) =>
      console.log(
        `  ${kb(r.before).padStart(10)} → ${kb(r.after).padStart(9)}  ` +
          `${String(Math.round((1 - r.after / r.before) * 100)).padStart(3)}%  ${r.file}`
      )
    );

  console.log(
    `\n${converted.length} converted: ${kb(before)} → ${kb(after)} ` +
      `(${Math.round((1 - after / before) * 100)}% smaller), ${rewritten} source files repointed`
  );

  const skipped = results.filter((r) => r.skipped);
  if (skipped.length) {
    console.log(`\n${skipped.length} left alone — WebP came out no smaller:`);
    skipped.forEach((r) => console.log(`  ${r.file}`));
  }

  if (oversized.length) {
    console.log(
      `\nWider than ${OVERSIZED_WIDTH}px and worth a look — resizing needs the ` +
        `display size, which this script cannot know:`
    );
    oversized.forEach((o) => console.log(`  ${o.width}x${o.height}  ${o.file}`));
  }

  if (orphans.length) {
    const bytes = orphans.reduce((a, f) => a + fs.statSync(f).size, 0);
    console.log(
      `\n${orphans.length} raster files nothing imports (${kb(bytes)}). Vite does ` +
        `not bundle these, so they cost nothing at runtime — repo weight only:`
    );
    orphans.forEach((f) => console.log(`  ${f}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
