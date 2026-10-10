// Evaluare Spine 3.8 pentru subsetul pe care îl produce build.mjs (oase cu rotate/translate, mesh-uri ponderate)
// și randare software pe CPU, ca verificările să ruleze fără browser.
import fs from 'node:fs';
import path from 'node:path';
import { readPNG } from './png.mjs';
import { rad } from './geom.mjs';

export function loadRig(dir) {
  const skeleton = JSON.parse(fs.readFileSync(path.join(dir, 'skeleton.json'), 'utf8'));
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const lines = fs.readFileSync(path.join(dir, 'rig.atlas'), 'utf8').split('\n');
  const regions = {};
  let cur = null;
  for (const line of lines.slice(5)) {
    if (!line.trim()) continue;
    if (!line.startsWith(' ')) { cur = regions[line.trim()] = {}; continue; }
    const [k, v] = line.trim().split(':');
    if (k === 'xy' || k === 'size') cur[k] = v.split(',').map(Number);
  }
  const page = readPNG(path.join(dir, lines[0].trim()));
  const art = readPNG(path.join(dir, 'art.png'));
  return { skeleton, meta, regions, page, art };
}

/** Valoarea unei linii de timp la momentul t (interpolare liniară între chei). */
function sample(keys, t, field) {
  if (!keys?.length) return 0;
  if (t <= keys[0].time) return keys[0][field] ?? 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.time) { const u = (t - a.time) / (b.time - a.time || 1); return (a[field] ?? 0) + ((b[field] ?? 0) - (a[field] ?? 0)) * u; }
  }
  return keys.at(-1)[field] ?? 0;
}

/** Transformările lumii pentru fiecare os (matrice 2×2 + poziție), în poza animației `anim` la t (sau în repaus). */
export function pose(skeleton, anim, t = 0) {
  const tl = anim ? skeleton.animations[anim].bones : {};
  const world = {};
  for (const b of skeleton.bones) {
    const k = tl[b.name] ?? {};
    const x = (b.x ?? 0) + sample(k.translate, t, 'x'), y = (b.y ?? 0) + sample(k.translate, t, 'y');
    const r = rad((b.rotation ?? 0) + sample(k.rotate, t, 'angle'));
    const la = Math.cos(r), lb = -Math.sin(r), lc = Math.sin(r), ld = Math.cos(r);
    const p = world[b.parent];
    world[b.name] = p
      ? { a: p.a * la + p.b * lc, b: p.a * lb + p.b * ld, c: p.c * la + p.d * lc, d: p.c * lb + p.d * ld, x: p.a * x + p.b * y + p.x, y: p.c * x + p.d * y + p.y }
      : { a: la, b: lb, c: lc, d: ld, x, y };
  }
  return world;
}

/** Vârfurile fiecărui mesh în scenă: { slot: { pts: [[x,y]...], uvs, triangles, region } }. */
export function meshes(rig, world) {
  const { skeleton, regions } = rig, names = skeleton.bones.map((b) => b.name), out = {};
  const atts = skeleton.skins[0].attachments;
  for (const slot of skeleton.slots) {
    const att = atts[slot.name][slot.attachment], v = att.vertices, n = att.uvs.length / 2, pts = [];
    if (v.length === n * 2) {
      const w = world[slot.bone];
      for (let i = 0; i < n; i++) pts.push([w.a * v[2 * i] + w.b * v[2 * i + 1] + w.x, w.c * v[2 * i] + w.d * v[2 * i + 1] + w.y]);
    } else {
      for (let i = 0; i < v.length; ) {
        let X = 0, Y = 0;
        for (let c = v[i++]; c > 0; c--) {
          const w = world[names[v[i]]], lx = v[i + 1], ly = v[i + 2], k = v[i + 3];
          X += k * (w.a * lx + w.b * ly + w.x); Y += k * (w.c * lx + w.d * ly + w.y);
          i += 4;
        }
        pts.push([X, Y]);
      }
    }
    out[slot.name] = { pts, uvs: att.uvs, triangles: att.triangles, region: regions[att.path ?? slot.attachment] };
  }
  return out;
}

/**
 * Desenează mesh-urile într-o imagine RGBA. `view` duce scena în pixeli: px = (x - view.x) * view.k, py = (view.top - y) * view.k.
 */
export function render(rig, meshList, view, image) {
  const { page } = rig, { width: IW, height: IH, data } = image;
  for (const m of Object.values(meshList)) {
    const P = m.pts.map(([x, y]) => [(x - view.x) * view.k, (view.top - y) * view.k]);
    const [rx, ry] = m.region.xy, [rw, rh] = m.region.size;
    const T = [];
    for (let i = 0; i < m.uvs.length; i += 2) T.push([rx + m.uvs[i] * rw, ry + m.uvs[i + 1] * rh]);
    for (let k = 0; k < m.triangles.length; k += 3) {
      const [i0, i1, i2] = [m.triangles[k], m.triangles[k + 1], m.triangles[k + 2]];
      const a = P[i0], b = P[i1], c = P[i2];
      const det = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
      if (Math.abs(det) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(IW - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(IH - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      const ta = T[i0], tb = T[i1], tc = T[i2];
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5 - a[0], py = y + 0.5 - a[1];
          const u = (px * (c[1] - a[1]) - py * (c[0] - a[0])) / det, v = (py * (b[0] - a[0]) - px * (b[1] - a[1])) / det;
          if (u < -1e-4 || v < -1e-4 || u + v > 1 + 1e-4) continue;
          const sx = Math.min(page.width - 1, Math.max(0, Math.floor(ta[0] + u * (tb[0] - ta[0]) + v * (tc[0] - ta[0]))));
          const sy = Math.min(page.height - 1, Math.max(0, Math.floor(ta[1] + u * (tb[1] - ta[1]) + v * (tc[1] - ta[1]))));
          const si = (sy * page.width + sx) * 4, al = page.data[si + 3] / 255;
          if (!al) continue;
          const di = (y * IW + x) * 4;
          for (let ch = 0; ch < 3; ch++) data[di + ch] = data[di + ch] * (1 - al) + page.data[si + ch] * al;
          data[di + 3] = Math.max(data[di + 3], page.data[si + 3]);
        }
    }
  }
  return image;
}
