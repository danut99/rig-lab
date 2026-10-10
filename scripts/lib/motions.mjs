// Animațiile unui biped, coapte cadru cu cadru (30 fps) în chei Spine: rotate/translate față de poza de repaus.
// Picioarele au IK pe două segmente: laba rămâne pe sol (sau pe ținta din animație), coapsa și gamba se calculează.
import { add, angleOf, clamp, deg, len, rot, r2, smooth, sub } from './geom.mjs';

const FPS = 30, TAU = Math.PI * 2;
const env = (t, a, b, c, d) => (t < a || t > d ? 0 : t < b ? smooth((t - a) / (b - a)) : t <= c ? 1 : 1 - smooth((t - c) / (d - c)));
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a), 0, 1));

/**
 * @param rig  { byName, neck: string[], tail: string[], legs: {near, far}, arm: bool }
 *   byName[n] = { wx, wy, wrot, length, lrot } în poza de repaus (scenă, y în sus)
 * @returns { animations, list }
 */
export function bakeMotions(rig) {
  const { byName, neck: NECK, tail: TAIL } = rig;
  const body = byName.body;
  const LEGS = {};
  for (const side of ['near', 'far']) {
    const t = byName[side + 'Thigh'], s = byName[side + 'Shin'], f = byName[side + 'Foot'];
    if (!t) continue;
    LEGS[side] = { hip: [t.wx, t.wy], ankle: [f.wx, f.wy], L1: t.length, L2: s.length,
      // sensul genunchiului: de ce parte a liniei șold–gleznă stă genunchiul în poza de repaus
      bend: Math.sign(wrap(angleOf([s.wx - t.wx, s.wy - t.wy]) - angleOf([f.wx - t.wx, f.wy - t.wy]))) || 1 };
  }
  const legSpan = LEGS.near ? LEGS.near.L1 + LEGS.near.L2 : 200;

  /** IK în cadrul trunchiului: rotațiile (față de repaus) ale coapsei, gambei și labei ca glezna să ajungă la `target`. */
  function solveLeg(side, pose, target, tilt = 0) {
    const g = LEGS[side], br = pose.body.rot;
    const local = rot(sub(target, [body.wx + pose.body.x, body.wy + pose.body.y]), -br);
    const hip = sub(g.hip, [body.wx, body.wy]), d0 = sub(local, hip), d = clamp(len(d0), 10, g.L1 + g.L2 - 0.01);
    const a = angleOf(d0), alpha = deg(Math.acos(clamp((g.L1 * g.L1 + d * d - g.L2 * g.L2) / (2 * g.L1 * d), -1, 1)));
    const upper = a + g.bend * alpha, knee = add(hip, rot([g.L1, 0], upper)), shin = angleOf(sub(local, knee));
    const t0 = byName[side + 'Thigh'], s0 = byName[side + 'Shin'], f0 = byName[side + 'Foot'];
    return { thigh: upper - t0.lrot, shin: shin - upper - s0.lrot, foot: f0.wrot + tilt - br - shin - f0.lrot };
  }
  const planted = () => Object.fromEntries(Object.entries(LEGS).map(([k, g]) => [k, [g.ankle[0], g.ankle[1], 0]]));

  function bake(duration, poseAt) {
    const anim = { bones: {} };
    const put = (b, kind, key) => ((anim.bones[b] ??= {})[kind] ??= []).push(key);
    const n = Math.round(duration * FPS);
    for (let i = 0; i <= n; i++) {
      const t = Math.min(duration, i / FPS), p = poseAt(t), time = r2(t);
      put('body', 'translate', { time, x: r2(p.body.x), y: r2(p.body.y) });
      put('body', 'rotate', { time, angle: r2(p.body.rot) });
      put('chest', 'rotate', { time, angle: r2(p.chest ?? 0) });
      NECK.forEach((nb) => put(nb, 'rotate', { time, angle: r2((p.neck ?? 0) / NECK.length) }));
      put('head', 'rotate', { time, angle: r2(p.head ?? 0) });
      TAIL.forEach((tb, k) => put(tb, 'rotate', { time, angle: r2(p.tail?.[k] ?? 0) }));
      for (const side of Object.keys(LEGS)) {
        const f = p.feet?.[side] ?? [LEGS[side].ankle[0], LEGS[side].ankle[1], 0], s = solveLeg(side, p, [f[0], f[1]], f[2] ?? 0);
        put(side + 'Thigh', 'rotate', { time, angle: r2(s.thigh) });
        put(side + 'Shin', 'rotate', { time, angle: r2(s.shin) });
        put(side + 'Foot', 'rotate', { time, angle: r2(s.foot) });
      }
      if (rig.arm) for (const b of ['armUpper', 'armFore', 'armHand']) put(b, 'rotate', { time, angle: r2(p.arm?.[b] ?? 0) });
    }
    return anim;
  }
  const tailWave = (t, period, amps, lag = 0.8) => amps.map((a, i) => a * Math.sin((TAU * t) / period - lag * i));
  const armSwing = (t, period, amp, off = 0) => ({ armUpper: amp * Math.sin((TAU * t) / period + off), armFore: amp * 0.7 * Math.sin((TAU * t) / period + off + 0.8), armHand: amp * 0.4 * Math.sin((TAU * t) / period + off + 1.4) });
  const tailAmps = (k) => TAIL.map((_, i) => k * (1 + i * 0.6));

  // repaus: respirație, coada leagănă ușor, capul se uită în jur; labele stau pe sol
  const IDLE = 3.2;
  const idle = bake(IDLE, (t) => {
    const w = (TAU * t) / IDLE, b = Math.sin(w);
    return {
      body: { x: 0, y: 3 * b, rot: 0.8 * b }, chest: 1.2 * Math.sin(w + 0.6),
      neck: 3 * Math.sin(w + 1.1), head: -2 * Math.sin(w + 1.4) + 1.5 * Math.sin(2 * w + 0.4),
      tail: tailWave(t, IDLE, tailAmps(1.2)), arm: armSwing(t, IDLE, 3), feet: planted(),
    };
  });

  // mers: pași cu labele pe sol (faza de sprijin și cea de zbor a piciorului), coada în contra-fază, capul stabil
  const WALK = rig.walkSeconds ?? 1.0;
  const stride = legSpan * 0.62, lift = legSpan * 0.2;
  const PHASE = { near: 0, far: 0.5 };
  // în desen picioarele sunt la capetele pasului (unul în față, unul în spate): la mers, amândouă pășesc în jurul
  // aceluiași punct față de șold, altfel cel din spate s-ar strânge de tot când vine în față
  const sides = Object.values(LEGS), reach = sides.reduce((t, g) => t + g.ankle[0] - g.hip[0], 0) / sides.length;
  const center = (g) => g.hip[0] + reach;
  const walk = bake(WALK, (t) => {
    const ph = t / WALK, w = TAU * ph, bob = 5 * (1 - Math.cos(2 * w));
    const p = { body: { x: 0, y: -bob + 2, rot: 1.5 * Math.sin(2 * w + 0.6) }, chest: -1 * Math.sin(2 * w + 1) };
    p.neck = 3 * Math.sin(2 * w + 1.3);
    p.head = -p.body.rot - 2 * Math.sin(2 * w + 1.8);
    p.tail = tailWave(t, WALK, tailAmps(1.8), 0.9);
    p.arm = armSwing(t, WALK, 6);
    p.feet = {};
    for (const side of Object.keys(LEGS)) {
      const g = LEGS[side], q = (ph + PHASE[side]) % 1, stance = 0.6;
      let x, y, tilt = 0;
      if (q < stance) { x = center(g) + stride / 2 - (stride * q) / stance; y = g.ankle[1]; }
      else { const u = (q - stance) / (1 - stance); x = center(g) - stride / 2 + stride * smooth(u); y = g.ankle[1] + lift * Math.sin(Math.PI * u); tilt = -28 * Math.sin(Math.PI * u); }
      p.feet[side] = [x, y, tilt];
    }
    return p;
  });

  // atac: se ghemuiește, se aruncă înainte și sfâșie cu ghearele, mușcă; piciorul din față face un pas
  const ATTACK = 1.8;
  const attack = bake(ATTACK, (t) => {
    const wind = env(t, 0.1, 0.5, 0.6, 0.75), hit = env(t, 0.65, 0.85, 0.95, 1.4), shake = Math.sin(TAU * 8 * (t - 0.85)) * env(t, 0.85, 0.9, 1.05, 1.2);
    const p = { body: { x: -20 * wind + 60 * hit, y: -10 * wind - 4 * hit, rot: 5 * wind - 7 * hit }, chest: 3 * wind - 4 * hit, feet: planted() };
    p.neck = 8 * wind - 14 * hit; p.head = 4 * wind - 5 * hit + 2 * shake;
    p.tail = TAIL.map((_, i) => (-4 - 2 * i) * wind + (3 + 2 * i) * hit);
    p.arm = { armUpper: 35 * wind - 55 * hit, armFore: 20 * wind - 35 * hit, armHand: -20 * hit };
    const step = env(t, 0.6, 0.85, 1.3, 1.65), up = bump(t, 0.6, 0.85);
    const f = p.feet.near;
    if (f) p.feet.near = [f[0] + 55 * step, f[1] + 0.18 * legSpan * up, -10 * up];
    const g = p.feet.far;
    if (g) p.feet.far = [g[0] + 25 * step, g[1], 0];
    return p;
  });

  // ultimată: se ghemuiește, se ridică și răcnește spre cer, apoi calcă apăsat
  const ULT = 3.2, STOMP = 2.3;
  const ultimate = bake(ULT, (t) => {
    const crouch = env(t, 0.1, 0.6, 0.75, 1.0), rear = env(t, 0.8, 1.3, 2.0, 2.3), tremble = Math.sin(TAU * 10 * t) * env(t, 1.2, 1.4, 1.9, 2.1);
    const land = env(t, STOMP - 0.05, STOMP + 0.05, STOMP + 0.15, STOMP + 0.6);
    const p = { body: { x: 0, y: -10 * crouch + 8 * rear - 8 * land, rot: 6 * rear - 2 * land + tremble }, chest: 3 * rear, feet: planted() };
    p.neck = 9 * rear - 6 * crouch - 4 * land + 1.5 * tremble;
    p.head = 9 * rear - 5 * land + 2 * tremble;
    p.tail = TAIL.map((_, i) => (3 + 1.5 * i) * Math.sin(TAU * 1.2 * t - i * 0.8) * rear - 4 * crouch);
    p.arm = { armUpper: 25 * rear + 4 * tremble, armFore: 15 * rear, armHand: 10 * rear };
    const up = env(t, 1.5, 2.1, 2.2, STOMP);
    if (p.feet.near) p.feet.near = [p.feet.near[0] + 20 * env(t, 1.5, 2.1, 2.9, 3.2), p.feet.near[1] + 0.22 * legSpan * up, -14 * up];
    return p;
  });

  return {
    animations: { idle, walk, attack, ultimate },
    list: [
      { name: 'idle', label: 'Repaus', duration: IDLE, loop: true },
      { name: 'walk', label: 'Mers', duration: WALK, loop: true },
      { name: 'attack', label: 'Atac', duration: ATTACK, loop: false },
      { name: 'ultimate', label: 'Atac puternic', duration: ULT, loop: false },
    ],
  };
}

