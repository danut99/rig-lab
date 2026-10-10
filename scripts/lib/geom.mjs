// Geometrie 2D pe perechi [x, y].
export const rad = (d) => (d * Math.PI) / 180;
export const deg = (r) => (r * 180) / Math.PI;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const len = (a) => Math.hypot(a[0], a[1]);
export const angleOf = (a) => deg(Math.atan2(a[1], a[0]));
export const rot = ([x, y], a) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [c * x - s * y, s * x + c * y]; };
export const r2 = (v) => Math.round(v * 100) / 100;

export function inside(poly, x, y) {
  let ok = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}

export function segDist(p, a, b) {
  const ab = sub(b, a), t = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1), 0, 1);
  return len(sub(p, add(a, mul(ab, t))));
}

/** Distanța de la un punct la conturul unui poligon. */
export const polyDist = (poly, p) => Math.min(...poly.map((a, i) => segDist(p, a, poly[(i + 1) % poly.length])));
