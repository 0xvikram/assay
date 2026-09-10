/**
 * Every photograph on the site passes through here: crop, grayscale, then the
 * navy duotone from docs/BRAND.md, so no image brings its own colour. With
 * --key it also lifts a plain museum backdrop out to transparency, so the
 * sculpture stands on the marble ground instead of in a grey box.
 *
 *   node scripts/brand-images.mjs in.jpg public/brand/out.webp \
 *     [--crop left,top,width,height] [--width 1600] [--gamma 1] [--flip] \
 *     [--key] [--tol 9] [--spread 60] [--feather 6] [--levels] [--q 80]
 */
import sharp from "sharp";

const args = process.argv.slice(2);
const [input, output] = args;
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i === -1 ? dflt : args[i + 1]; };
const flag = (name) => args.includes(`--${name}`);
if (!input || !output || input.startsWith("--")) {
  console.error("usage: node scripts/brand-images.mjs <in> <out.webp> [--crop l,t,w,h] [--width px] [--gamma g] [--flip] [--key] [--tol n] [--spread n] [--feather px] [--q n]");
  process.exit(2);
}

// Navy shadows, a cobalt middle, marble highlights. A straight two-colour ramp
// goes grey-lavender in the midtones; the middle stop keeps them blue.
const STOPS = [[0, [8, 20, 78]], [0.5, [74, 106, 198]], [1, [243, 246, 252]]];
const tone = (t) => {
  for (let i = 1; i < STOPS.length; i++) {
    const [t0, c0] = STOPS[i - 1];
    const [t1, c1] = STOPS[i];
    if (t <= t1) { const k = (t - t0) / (t1 - t0); return c0.map((v, j) => Math.round(v + (c1[j] - v) * k)); }
  }
  return STOPS.at(-1)[1];
};
const gamma = Number(opt("gamma", 1));
const LUT = Array.from({ length: 256 }, (_, v) => tone(Math.pow(v / 255, gamma)));

let img = sharp(input).rotate();
const crop = opt("crop");
if (crop) { const [left, top, width, height] = crop.split(",").map(Number); img = img.extract({ left, top, width, height }); }
if (flag("flip")) img = img.flop();
img = img.resize({ width: Number(opt("width", 1600)), withoutEnlargement: true }).grayscale().normalise();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const lum = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) lum[i] = data[i * C];

const alpha = new Uint8Array(W * H).fill(255);
if (flag("key")) {
  const tol = Number(opt("tol", 9));
  const spread = Number(opt("spread", 60));
  const feather = Number(opt("feather", 6));
  const border = [];
  for (let x = 0; x < W; x++) border.push(lum[x], lum[(H - 1) * W + x]);
  for (let y = 0; y < H; y++) border.push(lum[y * W], lum[y * W + W - 1]);
  border.sort((a, b) => a - b);
  const bg = border[border.length >> 1];
  // A studio sweep is a vertical gradient, so one backdrop level for the whole
  // frame is wrong at the top or the bottom. Each row is measured against the
  // backdrop at its own two edges instead.
  const E = Math.max(8, Math.round(W * 0.02));
  const rowBg = new Float32Array(H);
  for (let y = 0; y < H; y++) {
    const edge = [];
    for (let x = 0; x < E; x++) edge.push(lum[y * W + x], lum[y * W + W - 1 - x]);
    edge.sort((a, b) => a - b);
    rowBg[y] = edge[edge.length >> 1];
  }
  const near = (i) => Math.abs(lum[i] - rowBg[(i / W) | 0]) < spread;
  // Flood from the frame inward, stepping only between near-identical
  // neighbours that are still near the backdrop level: a smooth studio sweep
  // is taken, the sculpture's edge stops it.
  const seen = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  let sp = 0;
  const seed = (i) => { if (!seen[i] && near(i)) { seen[i] = 1; stack[sp++] = i; } };
  for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
  while (sp) {
    const p = stack[--sp];
    const x = p % W, y = (p / W) | 0;
    const v = lum[p];
    const tryN = (n) => { if (!seen[n] && Math.abs(lum[n] - v) <= tol && near(n)) { seen[n] = 1; stack[sp++] = n; } };
    if (x > 0) tryN(p - 1);
    if (x < W - 1) tryN(p + 1);
    if (y > 0) tryN(p - W);
    if (y < H - 1) tryN(p + W);
  }
  // Feather the matte with two box-blur passes so the edge dissolves, not cuts.
  let m = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = seen[i] ? 0 : 1;
  const blur = (src, r) => {
    const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * W + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { tmp[y * W + x] = s / (2 * r + 1); s += src[y * W + Math.min(W - 1, x + r + 1)] - src[y * W + Math.max(0, x - r)]; } }
    for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { out[y * W + x] = s / (2 * r + 1); s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]; } }
    return out;
  };
  if (feather > 0) m = blur(blur(m, feather), feather);
  for (let i = 0; i < W * H; i++) alpha[i] = Math.round(255 * Math.min(1, Math.max(0, m[i])));
  const kept = alpha.reduce((a, v) => a + (v > 127 ? 1 : 0), 0) / (W * H);
  console.log(`keyed backdrop level ${bg}: kept ${(kept * 100).toFixed(1)}% of the frame`);
}

// With the backdrop gone, stretch the sculpture's own tones end to end: a pale
// marble cut from a dark sweep otherwise lands in one narrow band of blue.
if (flag("levels")) {
  const kept = [];
  for (let i = 0; i < W * H; i += 3) if (alpha[i] > 200) kept.push(lum[i]);
  kept.sort((a, b) => a - b);
  const lo = kept[Math.floor(kept.length * 0.01)] ?? 0, hi = kept[Math.floor(kept.length * 0.995)] ?? 255;
  for (let i = 0; i < W * H; i++) lum[i] = Math.max(0, Math.min(255, Math.round(((lum[i] - lo) / Math.max(1, hi - lo)) * 255)));
  console.log(`levels ${lo}..${hi} stretched to 0..255`);
}

const out = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const [r, g, b] = LUT[lum[i]];
  out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = alpha[i];
}
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: Number(opt("q", 80)), alphaQuality: 90, effort: 5 }).toFile(output);
console.log(`${output}  ${W}x${H}`);
