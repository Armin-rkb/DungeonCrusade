#!/usr/bin/env node
// Level extractor: turns the original Unity 5.4 arena scenes into JSON levels.
//
// Reads the three arena scenes of the original game (plus every prefab they
// instance) straight from the Unity YAML in ./Assets and writes
// src/shared/levels/<id>.json in the LevelData shape used by the TypeScript
// engine:
//   view         camera rect (bottom-left x/y, w/h) for a 16:9 screen
//   layers       every visible SpriteRenderer: sprite/anim id, pivot x/y, world scale,
//                rot, flips, colour, z (sortingLayer*100000 + order*10 + tie; lower first)
//   solids       non-trigger colliders as merged AABBs; `oneWay` marks PlatformEffector2D
//                platforms, `group`/`piece` link scripted geometry to its prop
//   spawns       MatchStart._transformPoints (P1..P4); pickupSpawns: PickupSpawner
//   wraps        LevelWrap boxes (teleport to x = to)
//   props        scripted objects with their serialized values; notes: anything surprising
//
// Everything stays in Unity world units with the y axis pointing UP.
//
// Requires public/gen/manifest.json + unity-sprite-index.json from
// tools/build-assets.mjs (run `npm run assets` first).
//
// Usage: node tools/extract-levels.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'Assets');
const GEN = path.join(ROOT, 'public', 'gen');
const OUT_DIR = path.join(ROOT, 'src', 'shared', 'levels');

// =============================================================================
// 1. A tiny parser for the subset of YAML that Unity writes
// =============================================================================
//
// Unity text assets are a stream of documents, each starting with
//   --- !u!<classID> &<fileID> [stripped]
// followed by a single "TypeName:" mapping. Values are plain scalars, quoted
// strings, flow mappings ({a: b}) / sequences ([]), block mappings and block
// sequences (whose "- " sits at the SAME indentation as the parent key).
// All scalars are kept as strings; numbers are converted where they are used
// (guids such as 0000000000000000e000000000000000 would otherwise turn into 0).

const indentOf = (line) => line.length - line.trimStart().length;
const isSeqLine = (t) => t === '-' || t.startsWith('- ');
const KEY_RE = /^([^{\['"#][^:]*?):(?: (.*)|)$/;

function parseScalar(s) {
  s = s.trim();
  if (s.startsWith('{') || s.startsWith('[')) return parseFlow(s);
  if (s.startsWith("'")) return s.slice(1, s.lastIndexOf("'")).replace(/''/g, "'");
  if (s.startsWith('"')) {
    try { return JSON.parse(s.slice(0, s.lastIndexOf('"') + 1)); } catch { return s.slice(1, -1); }
  }
  return s;
}

function parseFlow(s) {
  let p = 0;
  const ws = () => { while (p < s.length && /\s/.test(s[p])) p++; };
  const value = () => {
    ws();
    if (s[p] === '{') {
      p++;
      const obj = {};
      for (;;) {
        ws();
        if (s[p] === '}') { p++; return obj; }
        const k0 = p;
        while (p < s.length && s[p] !== ':' && s[p] !== ',' && s[p] !== '}') p++;
        const key = s.slice(k0, p).trim();
        let v = '';
        if (s[p] === ':') { p++; v = value(); }
        obj[key] = v;
        ws();
        if (s[p] === ',') p++;
      }
    }
    if (s[p] === '[') {
      p++;
      const arr = [];
      for (;;) {
        ws();
        if (s[p] === ']') { p++; return arr; }
        arr.push(value());
        ws();
        if (s[p] === ',') p++;
      }
    }
    if (s[p] === "'" || s[p] === '"') {
      const q = s[p++];
      let out = '';
      while (p < s.length) {
        if (s[p] === q && q === "'" && s[p + 1] === "'") { out += "'"; p += 2; continue; }
        if (s[p] === '\\' && q === '"') { out += s[p + 1]; p += 2; continue; }
        if (s[p] === q) { p++; break; }
        out += s[p++];
      }
      return out;
    }
    const v0 = p;
    while (p < s.length && !',}]'.includes(s[p])) p++;
    return s.slice(v0, p).trim();
  };
  return value();
}

function parseBlock(lines) {
  let i = 0;

  const node = (indent) => (isSeqLine(lines[i].slice(indent)) ? seq(indent) : map(indent));

  // Plain/flow values may continue on following, more indented lines.
  const continued = (first, indent) => {
    let s = first;
    while (i < lines.length && indentOf(lines[i]) > indent) s += ' ' + lines[i++].trim();
    return parseScalar(s);
  };

  function map(indent) {
    const obj = {};
    while (i < lines.length) {
      const ind = indentOf(lines[i]);
      if (ind < indent) break;
      if (ind > indent) { i++; continue; } // stray line; ignore
      const t = lines[i].slice(ind);
      if (isSeqLine(t)) break;
      const m = KEY_RE.exec(t);
      if (!m) { i++; continue; }
      const key = m[1].trim();
      const rest = (m[2] ?? '').trim();
      i++;
      if (rest !== '') { obj[key] = continued(rest, indent); continue; }
      if (i < lines.length) {
        const nInd = indentOf(lines[i]);
        if (nInd > indent) { obj[key] = node(nInd); continue; }
        if (nInd === indent && isSeqLine(lines[i].slice(nInd))) { obj[key] = seq(indent); continue; }
      }
      obj[key] = '';
    }
    return obj;
  }

  function seq(indent) {
    const arr = [];
    while (i < lines.length && indentOf(lines[i]) === indent) {
      const t = lines[i].slice(indent);
      if (!isSeqLine(t)) break;
      const rest = t.slice(2);
      if (rest.trim() === '') {
        i++;
        arr.push(i < lines.length && indentOf(lines[i]) > indent ? node(indentOf(lines[i])) : '');
      } else if (KEY_RE.test(rest)) {
        // "- key: value" starts a mapping whose other keys sit at indent + 2.
        lines[i] = ' '.repeat(indent + 2) + rest;
        arr.push(map(indent + 2));
      } else {
        i++;
        arr.push(continued(rest, indent));
      }
    }
    return arr;
  }

  const result = lines.length ? node(indentOf(lines[0])) : {};
  return result;
}

/** Parses a Unity YAML file into [{cls, id, stripped, type, data}]. */
export function parseUnityYaml(text) {
  const docs = [];
  const chunks = text.replace(/\r\n/g, '\n').split(/^--- /m).slice(1);
  for (const chunk of chunks) {
    const nl = chunk.indexOf('\n');
    const head = /^!u!(\d+) &(-?\d+)( stripped)?/.exec(chunk.slice(0, nl));
    if (!head) continue;
    const lines = chunk.slice(nl + 1).split('\n').filter((l) => l.trim() !== '' && !l.startsWith('%'));
    const root = parseBlock(lines);
    const type = Object.keys(root)[0] ?? '';
    docs.push({ cls: Number(head[1]), id: head[2], stripped: !!head[3], type, data: root[type] || {} });
  }
  return docs;
}

// =============================================================================
// 2. Asset database (guid -> file, script names, prefabs, animator controllers)
// =============================================================================

/** Same id scheme as tools/build-assets.mjs. */
export function sanitize(rel) {
  return rel
    .split(/[\\/]/)
    .map((p) => p.toLowerCase().replace(/['"`]/g, '').replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
    .join('/');
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const relAsset = (abs) => path.relative(ASSETS, abs).split(path.sep).join('/');

export class AssetDb {
  constructor() {
    this.guidToPath = new Map();
    for (const f of walk(ASSETS)) {
      if (!f.endsWith('.meta')) continue;
      const m = /^guid: ([0-9a-f]{32})/m.exec(fs.readFileSync(f, 'utf8'));
      if (m) this.guidToPath.set(m[1], f.slice(0, -5));
    }
    this.yamlCache = new Map();
    // Texture ids that several different files sanitize to (asset pipeline collisions).
    this.textureIdOwners = new Map();
    for (const [, p] of this.guidToPath) {
      if (!/\.(png|jpg)$/i.test(p)) continue;
      const id = sanitize(relAsset(p).replace(/\.(png|jpg)$/i, ''));
      this.textureIdOwners.set(id, [...(this.textureIdOwners.get(id) ?? []), relAsset(p)]);
    }
    this.spriteIndex = JSON.parse(fs.readFileSync(path.join(GEN, 'unity-sprite-index.json'), 'utf8'));
    this.manifest = JSON.parse(fs.readFileSync(path.join(GEN, 'manifest.json'), 'utf8'));
    const tags = parseUnityYaml(fs.readFileSync(path.join(ROOT, 'ProjectSettings', 'TagManager.asset'), 'utf8'))[0].data;
    // Sorting layers draw in list order; renderers store the layer's uniqueID.
    this.sortingLayers = new Map(tags.m_SortingLayers.map((l, idx) => [Number(l.uniqueID) >>> 0, { index: idx, name: l.name }]));
  }

  /** Renderers store the layer id as a signed int32, the TagManager unsigned. */
  sortingLayer(id) {
    return this.sortingLayers.get(Number(id ?? 0) >>> 0) ?? this.sortingLayers.get(0);
  }

  path(guid) { return this.guidToPath.get(guid); }
  rel(guid) { const p = this.path(guid); return p ? relAsset(p) : undefined; }

  /** "PickupSpawner" for a MonoBehaviour's m_Script reference. */
  scriptName(ref) {
    const p = ref && this.path(ref.guid);
    if (!p) return ref && ref.guid ? `?${ref.guid}` : undefined;
    return p.endsWith('.cs') ? path.basename(p, '.cs') : `builtin:${ref.fileID}`;
  }

  yaml(absPath) {
    if (!this.yamlCache.has(absPath)) this.yamlCache.set(absPath, parseUnityYaml(fs.readFileSync(absPath, 'utf8')));
    return this.yamlCache.get(absPath);
  }

  /** Manifest audio id ("sound/music/dragon") for an AudioClip reference. */
  audio(ref) {
    const rel = hasGuid(ref) && this.rel(ref.guid);
    const id = rel && sanitize(rel.replace(/\.[^./]+$/, ''));
    return id && this.manifest.audio[id] ? id : undefined;
  }

  /** World position of a Transform inside a prefab asset ({fileID, guid} reference). */
  prefabTransform(ref) {
    const file = hasGuid(ref) && this.path(ref.guid);
    if (!file || !file.endsWith('.prefab')) return undefined;
    const docs = this.yaml(file);
    const byId = new Map(docs.map((d) => [d.id, d]));
    let m = IDENTITY;
    let name;
    for (let t = byId.get(String(ref.fileID)); t; t = byId.get(String(t.data.m_Father?.fileID))) {
      m = mul(localMatrix(t.data), m);
      name ??= byId.get(String(t.data.m_GameObject?.fileID))?.data.m_Name;
    }
    return { ...decompose(m), name, prefab: relAsset(file) };
  }

  /** Manifest sprite id for a {fileID, guid} sprite reference. */
  sprite(ref) {
    if (!ref || !ref.guid || ref.fileID === '0') return undefined;
    return this.spriteIndex[`${ref.guid}:${ref.fileID}`];
  }

  /**
   * Default clip of an Animator controller: {anim, clip, spritePaths, otherCurves}.
   * anim is the manifest anim id when the clip animates m_Sprite.
   */
  animatorDefault(controllerRef) {
    const ctrlPath = controllerRef && this.path(controllerRef.guid);
    if (!ctrlPath || !ctrlPath.endsWith('.controller')) return undefined;
    const docs = this.yaml(ctrlPath);
    const byId = new Map(docs.map((d) => [d.id, d]));
    const ctrl = docs.find((d) => d.cls === 91);
    const layer = ctrl?.data.m_AnimatorLayers?.[0];
    const sm = layer && byId.get(String(layer.m_StateMachine.fileID));
    const state = sm && byId.get(String(sm.data.m_DefaultState?.fileID));
    const motion = state?.data.m_Motion;
    const clipPath = motion && this.path(motion.guid);
    if (!clipPath || !clipPath.endsWith('.anim')) {
      return { controller: relAsset(ctrlPath), state: state?.data.m_Name, clip: undefined };
    }
    const clipRel = relAsset(clipPath);
    const animId = sanitize(clipRel.replace(/\.anim$/, ''));
    const clipText = fs.readFileSync(clipPath, 'utf8');
    const spritePaths = [];
    for (const c of (clipText.split('m_PPtrCurves:')[1] ?? '').split(/\n  - curve:/).slice(1)) {
      if (/attribute: m_Sprite/.test(c)) spritePaths.push((/\n    path: ?(.*)/.exec(c)?.[1] ?? '').trim());
    }
    const otherCurves = [...new Set([...clipText.matchAll(/\n {4}attribute: (\S+)\n {4}path: ?(.*)/g)]
      .filter((m) => m[1] !== 'm_Sprite')
      .map((m) => `${m[2].trim() || '.'}:${m[1]}`))];
    return {
      controller: relAsset(ctrlPath),
      state: state.data.m_Name,
      clip: clipRel,
      anim: this.manifest.anims[animId] ? animId : undefined,
      spritePaths,
      otherCurves,
    };
  }
}

// =============================================================================
// 3. Scene graph: scene objects + expanded prefab instances
// =============================================================================
//
// Unity 5.4 does not store the objects of a prefab instance in the scene. The
// scene only holds a "Prefab" document (class 1001) with the overridden
// properties (m_Modifications), plus "stripped" stubs for the instance objects
// that something in the scene references. We load the prefab file, give each
// of its objects the key "<instanceId>:<prefabFileId>", apply the overrides and
// point stripped stub ids at the expanded objects.

const isNullRef = (r) => !r || typeof r !== 'object' || r.fileID === undefined || String(r.fileID) === '0';
const hasGuid = (r) => r && r.guid && !/^0+$/.test(r.guid);

function setPath(obj, propertyPath, value) {
  // "m_LocalPosition.x", "_colors.Array.data[1].r", "_list.Array.size"
  const parts = propertyPath.replace(/\.Array\.data\[(\d+)\]/g, '.$1').replace(/\.Array\.size$/, '.__size').split('.');
  let cur = obj;
  for (let k = 0; k < parts.length - 1; k++) {
    const key = parts[k];
    if (cur[key] === undefined || typeof cur[key] !== 'object') cur[key] = /^\d+$/.test(parts[k + 1]) || parts[k + 1] === '__size' ? [] : {};
    cur = cur[key];
  }
  const last = parts[parts.length - 1];
  if (last === '__size') { if (Array.isArray(cur)) cur.length = Number(value); return; }
  cur[last] = value;
}

const getPath = (obj, propertyPath) => propertyPath
  .replace(/\.Array\.data\[(\d+)\]/g, '.$1').split('.')
  .reduce((o, k) => (o == null ? undefined : o[k]), obj);

export class Scene {
  constructor(db, sceneRel) {
    this.db = db;
    this.rel = sceneRel;
    this.objects = new Map(); // key -> {cls, key, type, data, ctx, prefab?}
    this.alias = new Map(); // stripped stub id -> expanded key
    this.prefabInstances = []; // [{id, prefab, root}]
    this.warnings = [];
    const docs = db.yaml(path.join(ASSETS, sceneRel));
    const instances = [];
    for (const d of docs) {
      if (d.cls === 1001) {
        // Prefab assets carry their own root "Prefab" document; only scene instances need expanding.
        if (String(d.data.m_IsPrefabParent) !== '1') instances.push(d);
      }
      else if (d.stripped) this.alias.set(d.id, `${d.data.m_PrefabInternal.fileID}:${d.data.m_PrefabParentObject.fileID}`);
      else this.objects.set(d.id, { ...d, key: d.id, ctx: '' });
    }
    for (const inst of instances) this.expandPrefab(inst);
  }

  expandPrefab(inst) {
    const mod = inst.data.m_Modification ?? {};
    const prefabRef = inst.data.m_ParentPrefab;
    const prefabPath = hasGuid(prefabRef) && this.db.path(prefabRef.guid);
    if (!prefabPath) { this.warnings.push(`prefab instance ${inst.id}: missing prefab ${prefabRef?.guid}`); return; }
    const ctx = `${inst.id}:`;
    const prefabRel = relAsset(prefabPath);
    let rootKey;
    for (const d of this.db.yaml(prefabPath)) {
      if (d.cls === 1001) continue;
      const o = { ...structuredClone(d), key: ctx + d.id, ctx, prefab: prefabRel, instance: inst.id };
      this.objects.set(o.key, o);
      if ((d.cls === 4 || d.cls === 224) && isNullRef(d.data.m_Father)) rootKey = o.key;
    }
    for (const m of mod.m_Modifications ?? []) {
      const target = this.objects.get(ctx + m.target.fileID);
      if (!target) continue;
      const cur = getPath(target.data, m.propertyPath);
      const isRef = !isNullRef(m.objectReference) || (cur && typeof cur === 'object' && 'fileID' in cur);
      // References in overrides point at scene objects (or assets), not at the prefab.
      setPath(target.data, m.propertyPath, isRef ? { ...m.objectReference, sceneRef: true } : m.value);
    }
    for (const r of mod.m_RemovedComponents ?? []) {
      const key = ctx + r.fileID;
      const comp = this.objects.get(key);
      if (!comp) continue;
      this.objects.delete(key);
      const go = this.objects.get(ctx + comp.data.m_GameObject?.fileID);
      if (go) go.data.m_Component = go.data.m_Component.filter((c) => String(Object.values(c)[0].fileID) !== String(r.fileID));
    }
    if (rootKey) {
      this.objects.get(rootKey).data.m_Father = { ...(mod.m_TransformParent ?? { fileID: '0' }), sceneRef: true };
    }
    this.prefabInstances.push({ id: inst.id, prefab: prefabRel, root: rootKey });
  }

  /** Resolves a {fileID} reference written inside `from` to an object. */
  resolve(ref, from) {
    if (isNullRef(ref) || hasGuid(ref)) return undefined;
    const key = ref.sceneRef || !from ? String(ref.fileID) : from.ctx + ref.fileID;
    const o = this.objects.get(key) ?? this.objects.get(this.alias.get(key));
    return o;
  }

  gameObject(comp) { return this.resolve(comp.data.m_GameObject, comp); }

  components(go) {
    return (go.data.m_Component ?? []).map((c) => this.resolve(Object.values(c)[0], go)).filter(Boolean);
  }

  component(go, cls) { return this.components(go).find((c) => c.cls === cls); }

  transform(go) { return this.components(go).find((c) => c.cls === 4 || c.cls === 224); }

  parentTransform(tr) { return this.resolve(tr.data.m_Father, tr); }

  /**
   * Children in sibling order. Built from the children's m_Father links: a prefab
   * instance's m_Children never lists scene objects that were parented under it,
   * and prefab roots are not always listed in their scene parent's m_Children.
   */
  childTransforms(tr) {
    if (!this._children) {
      this._children = new Map();
      for (const o of this.objects.values()) {
        if (o.cls !== 4 && o.cls !== 224) continue;
        const parent = this.parentTransform(o);
        if (!parent) continue;
        if (!this._children.has(parent)) this._children.set(parent, []);
        this._children.get(parent).push(o);
      }
      for (const [parent, kids] of this._children) {
        const listed = (parent.data.m_Children ?? []).map((r) => this.resolve(r, parent));
        const idx = (k) => (listed.includes(k) ? listed.indexOf(k) : listed.length);
        kids.sort((a, b) => n(a.data.m_RootOrder) - n(b.data.m_RootOrder) || idx(a) - idx(b));
      }
    }
    return this._children.get(tr) ?? [];
  }

  /** Every GameObject in hierarchy (depth first) order. */
  hierarchy() {
    if (this._hier) return this._hier;
    const rootOrder = (tr) => Number(tr.data.m_RootOrder ?? 0);
    const roots = [...this.objects.values()]
      .filter((o) => (o.cls === 4 || o.cls === 224) && !this.parentTransform(o) && this.gameObject(o))
      .sort((a, b) => rootOrder(a) - rootOrder(b));
    const out = [];
    const seen = new Set();
    const visit = (tr, depth) => {
      if (seen.has(tr)) return;
      seen.add(tr);
      const go = this.gameObject(tr);
      if (go) out.push({ go, tr, depth });
      for (const k of this.childTransforms(tr)) visit(k, depth + 1);
    };
    for (const r of roots) visit(r, 0);
    this._hier = out;
    return out;
  }

  /** activeInHierarchy */
  isActive(go) {
    for (let tr = this.transform(go); tr; tr = this.parentTransform(tr)) {
      const g = this.gameObject(tr);
      if (g && String(g.data.m_IsActive) === '0') return false;
    }
    return true;
  }

  /** Path like "Level/Platforms/Platform (3)" for debugging. */
  pathOf(go) {
    const names = [];
    for (let tr = this.transform(go); tr; tr = this.parentTransform(tr)) names.unshift(this.gameObject(tr)?.data.m_Name ?? '?');
    return names.join('/');
  }

  /** World matrix (3x4, row major) of a transform. */
  world(tr) {
    if (!tr) return IDENTITY;
    tr._world ??= mul(this.world(this.parentTransform(tr)), localMatrix(tr.data));
    return tr._world;
  }
}

// =============================================================================
// 4. Transforms
// =============================================================================

const n = (v, d = 0) => {
  const x = Number.parseFloat(v);
  return Number.isFinite(x) ? x : d;
};
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

function localMatrix(t) {
  const q = t.m_LocalRotation ?? {};
  const p = t.m_LocalPosition ?? {};
  const s = t.m_LocalScale ?? {};
  const [x, y, z, w] = [n(q.x), n(q.y), n(q.z), n(q.w, 1)];
  const [sx, sy, sz] = [n(s.x, 1), n(s.y, 1), n(s.z, 1)];
  const r = [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
  return [
    r[0] * sx, r[1] * sy, r[2] * sz, n(p.x),
    r[3] * sx, r[4] * sy, r[5] * sz, n(p.y),
    r[6] * sx, r[7] * sy, r[8] * sz, n(p.z),
  ];
}

function mul(a, b) {
  const o = new Array(12);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      o[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c] + (c === 3 ? a[r * 4 + 3] : 0);
    }
  }
  return o;
}

/** Applies a world matrix to a local 2D point. */
export const apply = (m, x, y) => [m[0] * x + m[1] * y + m[3], m[4] * x + m[5] * y + m[7]];

/**
 * 2D decomposition of a world matrix into position, rotation (deg) and signed
 * scale, i.e. M2x2 = R(rot) * diag(sx, sy). Of the two equivalent solutions
 * the one with the smaller rotation is used (so mirrored sprites get sx < 0).
 */
export function decompose(m) {
  const [a, b, c, d] = [m[0], m[1], m[4], m[5]];
  const det = a * d - b * c;
  const len = Math.hypot(a, c);
  let rot = Math.atan2(c, a) * 180 / Math.PI;
  let sx = len;
  let sy = len ? det / len : Math.hypot(b, d);
  if (Math.abs(rot) > 90.001) { rot = rot > 0 ? rot - 180 : rot + 180; sx = -sx; sy = -sy; }
  const shear = len ? Math.abs(a * b + c * d) / (len * Math.hypot(b, d) || 1) : 0;
  return { x: m[3], y: m[7], z: m[11], rot, sx, sy, shear };
}

export const round = (v, p = 4) => {
  const r = Math.round(v * 10 ** p) / 10 ** p;
  return Object.is(r, -0) ? 0 : r;
};

// =============================================================================
// 5. Level extraction
// =============================================================================

export const LEVELS = [
  // The Dungeon's LEVEL MUSIC AudioSource points at a clip guid that is no longer in the
  // project; Sound/Music/Dungeon.* is clearly the same track.
  { id: 'dungeon', name: 'Dungeon', scene: '_Scene/SceneFerry3.unity', musicFallback: 'sound/music/dungeon' },
  { id: 'beach', name: 'Wacky Beach', scene: '_Scene/WackyBeach.unity' },
  // The sea and the mountain backdrop share sorting layer, order and z; the reference
  // screenshot shows the sea in front.
  { id: 'dragon', name: 'Dragon Temple', scene: '_Scene/Levels/Dragon.unity', drawLast: [/^zee spritesheet/] },
];

const VIEW_ASPECT = 16 / 9;
const COLLIDER_KINDS = { 61: 'box', 58: 'circle', 60: 'polygon', 68: 'edge' };
const NON_LEVEL_ROOTS = new Set(['Managers', 'Main Camera', 'EventSystem']);
const EPS = 1e-3;

const enabled = (c) => String(c?.data.m_Enabled ?? '1') !== '0';
const flag = (v) => String(v ?? '0') === '1';

function hexColor(c, alpha = 'auto') {
  const h = (v) => Math.round(Math.min(1, Math.max(0, n(v, 1))) * 255).toString(16).padStart(2, '0');
  const a = h(c.a ?? 1);
  return `#${h(c.r)}${h(c.g)}${h(c.b)}${alpha === true || (alpha === 'auto' && a !== 'ff') ? a : ''}`;
}

const isWhite = (c) => !c || ['r', 'g', 'b', 'a'].every((k) => Math.abs(n(c[k], 1) - 1) < 1e-4);

/** Axis-aligned world bounds of a list of world points. */
function bounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

const roundRect = (r) => ({ x: round(r.x), y: round(r.y), w: round(r.w), h: round(r.h) });

/** World AABB of any 2D collider, plus a reason when the AABB is only an approximation. */
function colliderBounds(c, m) {
  const off = c.data.m_Offset ?? {};
  const [ox, oy] = [n(off.x), n(off.y)];
  const rotated = Math.abs(m[1]) > 1e-6 && Math.abs(m[0]) > 1e-6; // not a multiple of 90 degrees
  let approx = rotated ? 'rotated box' : undefined;
  let pts;
  switch (c.cls) {
    case 61: {
      const [w, h] = [n(c.data.m_Size?.x, 1) / 2, n(c.data.m_Size?.y, 1) / 2];
      pts = [[ox - w, oy - h], [ox + w, oy - h], [ox + w, oy + h], [ox - w, oy + h]];
      break;
    }
    case 58: {
      const r = n(c.data.m_Radius, 0.5);
      pts = [[ox - r, oy - r], [ox + r, oy - r], [ox + r, oy + r], [ox - r, oy + r]];
      approx = 'circle';
      break;
    }
    case 60:
      pts = (c.data.m_Points?.m_Paths ?? []).flat().map((p) => [n(p.x) + ox, n(p.y) + oy]);
      approx = 'polygon';
      break;
    case 68:
      pts = (c.data.m_Points ?? []).map((p) => [n(p.x) + ox, n(p.y) + oy]);
      approx = 'edge';
      break;
    default:
      return undefined;
  }
  if (!pts.length) return undefined;
  return { ...bounds(pts.map(([x, y]) => apply(m, x, y))), approx };
}

/**
 * Lossless rectangle merge: two rectangles with the same key are replaced by
 * their union when one contains the other, or when they share a full edge
 * (same y/h and touching or overlapping in x, or the same in y).
 */
export function mergeRects(rects, keyOf) {
  const out = rects.map((r) => ({ ...r, names: [r.name] }));
  const near = (a, b) => Math.abs(a - b) < EPS;
  const contains = (a, b) => a.x <= b.x + EPS && a.y <= b.y + EPS && a.x + a.w >= b.x + b.w - EPS && a.y + a.h >= b.y + b.h - EPS;
  const joinable = (a, b) => contains(a, b) || contains(b, a)
    || (near(a.y, b.y) && near(a.h, b.h) && a.x <= b.x + b.w + EPS && b.x <= a.x + a.w + EPS)
    || (near(a.x, b.x) && near(a.w, b.w) && a.y <= b.y + b.h + EPS && b.y <= a.y + a.h + EPS);
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) {
      for (let j = i + 1; j < out.length && !merged; j++) {
        const [a, b] = [out[i], out[j]];
        if (keyOf(a) !== keyOf(b) || !joinable(a, b)) continue;
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        out[i] = { ...a, x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y, names: [...a.names, ...b.names] };
        out.splice(j, 1);
        merged = true;
      }
    }
  }
  return out.map(({ names, ...r }) => ({ ...r, name: names.length > 1 ? `${names[0]} (+${names.length - 1} merged)` : names[0] }));
}

class LevelExtractor {
  constructor(db, def) {
    this.db = db;
    this.def = def;
    this.sc = new Scene(db, def.scene);
    this.notes = [...this.sc.warnings];
    this.hier = this.sc.hierarchy();
    this.order = new Map(this.hier.map((h, i) => [h.go, i]));
    this.groups = new Map(); // GameObject -> {group, piece}
    this.consumed = new Set(); // colliders handled by a prop / wrap (not solids)
    this.scripts = [];
    for (const { go } of this.hier) {
      for (const c of this.sc.components(go)) {
        if (c.cls === 114) this.scripts.push({ go, c, name: this.db.scriptName(c.data.m_Script) });
      }
    }
    const sm = this.script('SoundManager')[0];
    this.soundList = (sm?.c.data.audioList ?? []).map((r) => this.db.audio(r));
  }

  // ------------------------------------------------------------- helpers
  script(name, { activeOnly = true } = {}) {
    return this.scripts.filter((s) => s.name === name && (!activeOnly || (this.sc.isActive(s.go) && enabled(s.c))));
  }

  goOf(ref, from) {
    const o = this.sc.resolve(ref, from);
    return o && (o.cls === 1 ? o : this.sc.gameObject(o));
  }

  pos(go) {
    const w = decompose(this.sc.world(this.sc.transform(go)));
    return { x: round(w.x), y: round(w.y) };
  }

  name(go) { return String(go.data.m_Name ?? ''); }

  /** False for UI, cameras and manager objects. */
  isLevelObject(go) {
    let root = go;
    for (let tr = this.sc.transform(go); tr; tr = this.sc.parentTransform(tr)) {
      const g = this.sc.gameObject(tr);
      if (tr.cls === 224 || (g && (this.sc.component(g, 20) || this.sc.component(g, 223)))) return false;
      if (g) root = g;
    }
    return !NON_LEVEL_ROOTS.has(this.name(root));
  }

  descendants(go) {
    const out = [];
    const visit = (tr) => {
      const g = this.sc.gameObject(tr);
      if (g) out.push(g);
      for (const k of this.sc.childTransforms(tr)) visit(k);
    };
    visit(this.sc.transform(go));
    return out;
  }

  setGroup(go, group, extra = {}) {
    for (const g of this.descendants(go)) this.groups.set(g, { group, ...extra });
  }

  colliders(go) {
    return this.sc.components(go).filter((c) => COLLIDER_KINDS[c.cls]);
  }

  /** World AABB of the (first enabled) collider of an object, optionally triggers only. */
  colliderRect(go, { trigger } = {}) {
    const c = this.colliders(go).find((k) => enabled(k) && (trigger === undefined || flag(k.data.m_IsTrigger) === trigger));
    if (!c) return undefined;
    this.consumed.add(c);
    return roundRect(colliderBounds(c, this.sc.world(this.sc.transform(go))));
  }

  sound(index) { return this.soundList[index]; }

  /** {stateName: animId} for every state of an Animator controller + the default state name. */
  animatorStates(controllerRef) {
    const file = controllerRef && this.db.path(controllerRef.guid);
    if (!file || !file.endsWith('.controller')) return undefined;
    const docs = this.db.yaml(file);
    const states = {};
    for (const d of docs) {
      if (d.cls !== 1102) continue;
      const clip = this.db.rel(d.data.m_Motion?.guid ?? '');
      const id = clip && sanitize(clip.replace(/\.anim$/, ''));
      states[d.data.m_Name] = this.db.manifest.anims[id] ? id : clip;
    }
    const params = docs.find((d) => d.cls === 91)?.data.m_AnimatorParameters?.map((p) => p.m_Name) ?? [];
    return { controller: relAsset(file), default: this.db.animatorDefault(controllerRef)?.state, states, params };
  }

  /** Sprite/animation/physics summary of a GameObject inside a prefab asset. */
  prefabSummary(ref) {
    const file = hasGuid(ref) && this.db.path(ref.guid);
    if (!file || !file.endsWith('.prefab')) return undefined;
    const ps = new Scene(this.db, relAsset(file));
    const go = ps.objects.get(String(ref.fileID)) ?? [...ps.objects.values()].find((o) => o.cls === 1);
    const sr = ps.component(go, 212);
    const anim = ps.component(go, 95);
    const rb = ps.component(go, 50);
    const scripts = Object.fromEntries(ps.components(go).filter((c) => c.cls === 114).map((c) => [this.db.scriptName(c.data.m_Script), c]));
    return { ps, go, sr, anim, rb, scripts, prefab: relAsset(file), name: String(go.data.m_Name) };
  }

  // ------------------------------------------------------------- sections
  view() {
    const cams = this.hier.map((h) => this.sc.component(h.go, 20)).filter(Boolean);
    const cam = cams.find((c) => this.sc.gameObject(c).data.m_TagString === 'MainCamera') ?? cams[0];
    const go = this.sc.gameObject(cam);
    const p = decompose(this.sc.world(this.sc.transform(go)));
    const size = n(cam.data['orthographic size'], 5);
    if (!flag(cam.data.orthographic)) this.notes.push('Main camera is not orthographic; view computed from orthographic size anyway.');
    const h = size * 2;
    const w = h * VIEW_ASPECT;
    const bg = cam.data.m_BackGroundColor ?? { r: 0, g: 0, b: 0, a: 1 };
    if (n(bg.a, 1) < 0.5) {
      this.notes.push(`Camera clear colour ${hexColor(bg, true)} has ~0 alpha; Unity ignores the alpha when presenting, so bgColor keeps the RGB (${hexColor(bg, false)}).`);
    }
    return {
      view: { x: round(p.x - w / 2), y: round(p.y - h / 2), w: round(w), h: round(h) },
      bgColor: hexColor(bg, false),
      camera: { name: this.name(go), x: round(p.x), y: round(p.y), orthographicSize: size },
    };
  }

  music() {
    const listener = this.script('MusicListener')[0];
    const src = listener && this.sc.resolve(listener.c.data.levelOST, listener.c);
    const clipRef = src?.data.m_audioClip;
    const id = this.db.audio(clipRef);
    if (id) return id;
    if (this.def.musicFallback) {
      this.notes.push(`Level music AudioSource references a missing clip (guid ${clipRef?.guid ?? '?'}); using ${this.def.musicFallback}.`);
      return this.def.musicFallback;
    }
    return undefined;
  }

  spawns() {
    const ms = this.script('MatchStart')[0];
    if (!ms) { this.notes.push('No MatchStart found: no spawn points.'); return []; }
    return (ms.c.data._transformPoints ?? []).map((ref, i) => {
      // Spawn points are referenced straight from the prefab assets (TRANSFORMP1..4),
      // not from scene objects, so their position is the prefab's own position.
      const p = hasGuid(ref) ? this.db.prefabTransform(ref) : decompose(this.sc.world(this.sc.resolve(ref, ms.c)));
      if (!p) { this.notes.push(`Spawn P${i + 1}: unresolved reference.`); return { x: 0, y: 0 }; }
      return { x: round(p.x), y: round(p.y) };
    });
  }

  pickupSpawns() {
    const out = [];
    for (const s of this.script('PickupSpawner', { activeOnly: false })) {
      const p = this.pos(s.go);
      if (!this.sc.isActive(s.go) || !enabled(s.c)) {
        this.notes.push(`Skipped inactive PickupSpawner '${this.sc.pathOf(s.go)}' at (${p.x}, ${p.y}).`);
        continue;
      }
      out.push(p);
    }
    return out;
  }

  wraps() {
    return this.script('LevelWrap').map((s) => {
      const rect = this.colliderRect(s.go);
      const other = this.goOf(s.c.data._otherLevelSide, s.c);
      return { ...rect, to: other ? this.pos(other).x : 0 };
    });
  }

  props() {
    const props = [];

    // Dungeon: the candle holder is an armour pickup (+5 health, then destroyed with its sparkles).
    for (const s of this.script('Armour')) {
      props.push({ type: 'armor', name: this.name(s.go), ...this.pos(s.go), trigger: this.colliderRect(s.go, { trigger: true }), health: 5,
        note: 'Armour.cs: on player trigger -> HealthPlayer.ChangeHealth(5, false), then Destroy(gameObject) incl. children' });
      this.setGroup(s.go, 'armor');
    }

    // Dungeon: background sprite flashes between two colours.
    for (const s of this.script('BackgroundLightning')) {
      const target = this.goOf(s.c.data._backgroundSprite, s.c);
      const colors = (s.c.data._lightningColors ?? []).map((c) => hexColor(c));
      const sr = target && this.sc.component(target, 212);
      props.push({
        type: 'lightning', name: this.name(s.go), ...this.pos(s.go),
        target: target && this.name(target), baseColor: sr ? hexColor(sr.data.m_Color ?? {}) : undefined, colors,
        firstDelay: 1, interval: [10, 30],
        // StartLightning coroutine: [colour index, seconds to hold]
        flashes: [[0, 0.025], [1, 0.05], [0, 0.085], [1, 0.125]],
        sound: this.sound(19),
        note: 'InvokeRepeating("StartLightning", 1, Random.Range(10, 30)): the repeat interval is an int picked once (10..29 s); colour stays colors[1] afterwards',
      });
      if (target) this.setGroup(target, 'lightning-bg');
    }

    // Dungeon: tiles that explode when hit by a thrown barrel.
    let tile = 0;
    for (const s of this.script('TileExplosion')) {
      const id = tile++;
      props.push({ type: 'destructible', id, name: this.name(s.go), ...this.pos(s.go), rect: this.peekRect(s.go),
        breaksOn: 'Barrel', sound: this.sound(7), fx: 'smoke',
        note: 'TileExplosion.cs: OnCollisionEnter2D with "Barrel(Clone)" -> sound 7, FXManager.PlayFX(0 = smoke), Destroy(tile)' });
      this.setGroup(s.go, `destructible:${id}`);
    }

    // Beach: seagulls fly across and drop a pickup.
    for (const s of this.script('SeagullSpawner')) {
      const gull = this.prefabSummary(s.c.data._seagullObject);
      const mv = gull?.scripts.SeagullMovement;
      const drop = gull?.scripts.SeagullPickup;
      props.push({
        type: 'seagull-spawner', name: this.name(s.go), ...this.pos(s.go),
        firstDelay: [3, 10], interval: [30, 40],
        seagull: gull && {
          prefab: gull.prefab,
          sprite: this.db.sprite(gull.sr?.data.m_Sprite),
          anim: this.db.animatorDefault(gull.anim?.data.m_Controller)?.anim,
          vx: n(mv?.data._movementSpeed),
          gravityScale: n(gull.rb?.data.m_GravityScale, 1),
          constraints: 'freeze Y position + rotation (m_Constraints 6)',
          dropDelay: [1, 6],
          drops: (drop?.data._droppedObjects ?? []).map((r) => this.db.rel(r.guid)),
          dropSound: this.sound(20),
        },
        note: 'InvokeRepeating("SpawnSeagull", Random.Range(3,10), Random.Range(30,40)) (ints, picked once); seagull flies right at vx, drops one random object after Random.Range(1,6) s',
      });
    }

    // Particle systems (Dungeon rain).
    for (const { go } of this.hier) {
      const ps = this.sc.component(go, 198);
      if (!ps || !this.sc.isActive(go) || !this.isLevelObject(go)) continue;
      const d = ps.data;
      const m = this.sc.world(this.sc.transform(go));
      const sh = d.ShapeModule ?? {};
      const [bx, by, bz] = [n(sh.boxX, 1) / 2, n(sh.boxY, 1) / 2, n(sh.boxZ, 1) / 2];
      const corners = [];
      for (const sx of [-bx, bx]) for (const sy of [-by, by]) for (const sz of [-bz, bz]) {
        corners.push([m[0] * sx + m[1] * sy + m[2] * sz + m[3], m[4] * sx + m[5] * sy + m[6] * sz + m[7]]);
      }
      const dir = [m[2], m[6]]; // local +z = emission direction for a box shape
      const len = Math.hypot(...dir) || 1;
      const renderer = this.sc.component(go, 199);
      const sl = renderer && this.db.sortingLayer(renderer.data.m_SortingLayerID);
      const scalar = (mod, key) => n(d[mod]?.[key]?.scalar);
      props.push({
        type: /rain/i.test(this.name(go)) ? 'rain' : 'particles', name: this.name(go), ...this.pos(go),
        emitter: roundRect(bounds(corners)), direction: { x: round(dir[0] / len), y: round(dir[1] / len) },
        rate: scalar('EmissionModule', 'rate'), lifetime: scalar('InitialModule', 'startLifetime'),
        speed: scalar('InitialModule', 'startSpeed'), size: scalar('InitialModule', 'startSize'),
        gravityModifier: n(d.InitialModule?.gravityModifier), maxParticles: n(d.InitialModule?.maxNumParticles),
        stretch: renderer && { lengthScale: n(renderer.data.m_LengthScale), velocityScale: n(renderer.data.m_VelocityScale) },
        sortingLayer: sl?.name,
        // Same sorting bucket as the sprites of that layer; the reference screenshot only shows the
        // rain through the holes of the wall sprite, i.e. drawn just behind that bucket.
        z: sl ? sl.index * 100000 + Math.trunc(n(renderer.data.m_SortingOrder)) * 10 - 1 : undefined,
        note: 'Unity ParticleSystem (box shape, stretched billboards), emitter/direction projected to 2D; particles start moving along direction, then gravityModifier * 9.81 pulls them down',
      });
    }

    // Dragon: temple pieces blow apart when a bomb explodes inside the detection trigger.
    const pieces = this.script('TempleDestruction');
    if (pieces.length) {
      const detComp = this.sc.resolve(pieces[0].c.data._bombDetection, pieces[0].c);
      const detGo = detComp && this.sc.gameObject(detComp);
      const list = pieces.map((s, i) => {
        this.setGroup(s.go, 'temple', { piece: i });
        const rb = this.sc.component(s.go, 50);
        const hasCollider = this.colliders(s.go).some((c) => enabled(c) && !flag(c.data.m_IsTrigger));
        return { i, name: this.name(s.go), ...this.pos(s.go), solid: hasCollider, gravityScale: n(rb?.data.m_GravityScale, 1),
          ...(hasCollider && !this.sc.resolve(s.c.data._thisBoxCollider2D, s.c) ? { keepsCollider: true } : {}) };
      });
      props.push({
        type: 'temple', name: detGo ? this.name(detGo) : 'temple', ...(detGo ? this.pos(detGo) : { x: 0, y: 0 }),
        trigger: detGo && this.colliderRect(detGo, { trigger: true }),
        triggeredBy: 'BombExplosion (bomb bullet explosion entering the trigger)',
        burst: { vx: [-2, 1], vy: [-2, 4] },
        stopsMusic: this.script('DragonMusicHalt').length > 0,
        note: 'TempleDestruction.cs on bomb: collider.isTrigger = true, rigidbody non-kinematic, velocity = (Random.Range(-2,2), Random.Range(-2,5)) ints. ' +
          'Layers/solids of each piece carry group "temple" + piece index i.',
        pieces: list,
      });
    }

    // Dragon: sleeping dragon behind the temple that wakes up and flies off after the bomb.
    for (const s of this.script('WakeDragonAnim')) {
      const animator = this.sc.resolve(s.c.data._dragonAnimator, s.c);
      const mv = this.script('DragonMovement')[0];
      const sfx = this.script('DragonSFX')[0];
      const entrance = this.script('DragonEntrance')[0];
      const clip = (ref) => this.db.audio(this.sc.resolve(ref, sfx.c)?.data.m_audioClip);
      const flyby = entrance && this.goOf(entrance.c.data._dragon, entrance.c);
      const flybySr = flyby && this.sc.component(flyby, 212);
      const flybyMove = flyby && this.scripts.find((x) => x.go === flyby && x.name === 'SeagullMovement');
      const flybyRb = flyby && this.sc.component(flyby, 50);
      props.push({
        type: 'dragon', name: this.name(s.go), ...this.pos(s.go),
        animator: animator && this.animatorStates(animator.data.m_Controller),
        timeline: { wake: 3, fly: 6, enter: 9, note: 'seconds after the bomb: SetBool(DragonAwake), SetBool(DragonFly), OnDragonEnter' },
        fly: mv && { vx: n(mv.c.data._xSpeed), vy: n(mv.c.data._ySpeed), vyStepPerFrame: 0.25, vyMax: 10.25,
          note: 'Dragon_Fly clip event MoveDragonUp: rigidbody becomes dynamic, velocity (xSpeed, ySpeed) with ySpeed += 0.25 each frame while <= 10' },
        sounds: sfx && { awake: clip(sfx.c.data._wakeDragonSFX), enter: clip(sfx.c.data._enterDragonSFX) },
        cameraShake: this.script('DragonShake').length ? { power: 4, note: 'CameraShake.Shake(4) on enter, then ramps SetShakePower by 0.01/frame up to 0.15' } : undefined,
        flyby: flyby && {
          name: this.name(flyby), ...this.pos(flyby), activeAtStart: this.sc.isActive(flyby),
          sprite: this.db.sprite(flybySr?.data.m_Sprite), sortingLayer: this.db.sortingLayer(flybySr?.data.m_SortingLayerID)?.name,
          vx: n(flybyMove?.c.data._movementSpeed), gravityScale: n(flybyRb?.data.m_GravityScale, 1),
          note: 'DragonEntrance activates this placeholder on OnDragonEnter; SeagullMovement drives it right at vx (no collider)',
        },
      });
      this.setGroup(s.go, 'dragon');
    }

    return props;
  }

  /** Collider rect without marking it consumed (destructible tiles stay solid). */
  peekRect(go) {
    const c = this.colliders(go).find((k) => enabled(k) && !flag(k.data.m_IsTrigger));
    return c && roundRect(colliderBounds(c, this.sc.world(this.sc.transform(go))));
  }

  layers() {
    const out = [];
    const skipped = new Map(); // reason -> names
    const skip = (reason, go) => {
      if (!skipped.has(reason)) skipped.set(reason, []);
      skipped.get(reason).push(this.name(go));
    };
    const byGo = new Map();
    const raise = (name) => ((this.def.drawLast ?? []).some((re) => re.test(name)) ? 1 : 0);
    for (const { go, tr } of this.hier) {
      const sr = this.sc.component(go, 212);
      if (!sr || !this.isLevelObject(go)) continue;
      if (!this.sc.isActive(go)) { skip(`inactive '${this.inactiveRoot(go)}'`, go); continue; }
      if (!enabled(sr)) { skip('SpriteRenderer disabled', go); continue; }
      const sprite = this.db.sprite(sr.data.m_Sprite);
      if (!sprite) { skip(`unknown sprite ${sr.data.m_Sprite?.guid}:${sr.data.m_Sprite?.fileID}`, go); continue; }
      const w = decompose(this.sc.world(tr));
      if (w.shear > 1e-3) this.notes.push(`Layer '${this.name(go)}' has a sheared world transform; rendered without shear.`);
      const sl = this.db.sortingLayer(sr.data.m_SortingLayerID);
      const g = this.groups.get(go);
      const layer = {
        sprite,
        x: round(w.x), y: round(w.y), sx: round(w.sx), sy: round(w.sy),
        ...(Math.abs(w.rot) > 1e-4 ? { rot: round(w.rot, 3) } : {}),
        ...(flag(sr.data.m_FlipX) ? { flipX: true } : {}),
        ...(flag(sr.data.m_FlipY) ? { flipY: true } : {}),
        z: 0,
        ...(isWhite(sr.data.m_Color) ? {} : { color: hexColor(sr.data.m_Color, true) }),
        name: this.name(go),
        ...(g ? { group: g.group, ...(g.piece !== undefined ? { piece: g.piece } : {}) } : {}),
        _sort: [sl.index, Math.trunc(n(sr.data.m_SortingOrder)), -w.z, raise(this.name(go)), this.order.get(go)],
        _layerName: sl.name,
      };
      out.push(layer);
      byGo.set(go, layer);
    }

    // Animators: attach the default state's sprite clip to the renderer it drives.
    for (const { go } of this.hier) {
      const an = this.sc.component(go, 95);
      if (!an || !this.sc.isActive(go)) continue;
      const info = this.db.animatorDefault(an.data.m_Controller);
      if (!info) {
        if (byGo.has(go) && !isNullRef(an.data.m_Controller)) this.notes.push(`Animator on '${this.name(go)}' has an unresolved controller.`);
        continue;
      }
      if (!enabled(an)) { if (byGo.has(go)) this.notes.push(`Animator on '${this.name(go)}' is disabled; static sprite used.`); continue; }
      for (const p of info.spritePaths ?? []) {
        const target = p === '' ? go : this.findChild(go, p);
        const layer = target && byGo.get(target);
        if (layer && info.anim) layer.anim = info.anim;
      }
      if (info.otherCurves?.length && byGo.has(go)) {
        this.notes.push(`Animator on '${this.name(go)}' (${info.clip}) also animates ${info.otherCurves.join(', ')}; only sprite frames are exported.`);
      }
    }

    // Draw order: sorting layer, order in layer, distance from the camera (larger z first), hierarchy order.
    out.sort((a, b) => a._sort.reduce((d, v, i) => d || v - b._sort[i], 0));
    const buckets = new Map();
    for (const l of out) {
      const k = `${l._sort[0]}:${l._sort[1]}`;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(l);
    }
    for (const list of buckets.values()) {
      list.forEach((l, rank) => {
        l.z = round(l._sort[0] * 100000 + l._sort[1] * 10 + (rank * 9) / list.length, 4);
      });
    }
    const view = this.view().view;
    const outside = out.filter((l) => {
      const sp = this.db.manifest.sprites[l.sprite];
      const ext = Math.hypot(sp.w, sp.h) / sp.ppu * Math.max(Math.abs(l.sx), Math.abs(l.sy));
      return l.x + ext < view.x || l.x - ext > view.x + view.w || l.y + ext < view.y || l.y - ext > view.y + view.h;
    });
    if (outside.length) this.notes.push(`${outside.length} layer(s) lie completely outside the camera view (kept): ${this.summarize(outside.map((l) => l.name))}`);
    const used = [...new Set(out.map((l) => l._layerName))];
    this.notes.push(`Sorting layers used (back to front): ${used.join(', ')}. z = layerIndex*100000 + order*10 + tie (world z, then hierarchy order).`);
    if (this.def.drawLast) {
      this.notes.push(`Draw-order override (Unity leaves equal layer/order/z ties undefined): ${this.def.drawLast.join(', ')} drawn last within their sorting bucket to match the reference screenshot.`);
    }
    const collisions = new Map();
    for (const l of out) {
      const owners = this.db.textureIdOwners.get(l.sprite.split('#')[0]);
      if (owners && owners.length > 1) collisions.set(l.sprite.split('#')[0], [...(collisions.get(l.sprite.split('#')[0]) ?? []), l.name]);
    }
    for (const [id, names] of collisions) {
      this.notes.push(`Sprite id '${id}' is shared by ${this.db.textureIdOwners.get(id).length} different textures (${this.db.textureIdOwners.get(id).join(' | ')}): ` +
        `build-assets.mjs id collision, so some of these layers show the wrong tile: ${this.summarize(names)}`);
    }
    for (const [reason, names] of skipped) {
      this.notes.push(`Skipped ${names.length} sprite(s), ${reason}: ${this.summarize(names)}`);
    }
    return out.map(({ _sort, _layerName, ...l }) => l);
  }

  solids() {
    const raw = [];
    const skipped = new Map();
    const skip = (reason, go) => {
      if (!skipped.has(reason)) skipped.set(reason, []);
      skipped.get(reason).push(this.name(go));
    };
    for (const { go, tr } of this.hier) {
      if (!this.isLevelObject(go)) continue;
      for (const c of this.colliders(go)) {
        if (this.consumed.has(c)) continue;
        if (!this.sc.isActive(go)) { skip(`inactive '${this.inactiveRoot(go)}'`, go); continue; }
        if (!enabled(c)) { skip('collider disabled', go); continue; }
        if (flag(c.data.m_IsTrigger)) { skip('unhandled trigger', go); continue; }
        const rb = this.sc.component(go, 50);
        if (rb && !flag(rb.data.m_IsKinematic) && !this.groups.has(go)) { skip('dynamic rigidbody', go); continue; }
        const r = colliderBounds(c, this.sc.world(tr));
        if (!r) continue;
        if (r.approx) this.notes.push(`Solid '${this.name(go)}' is a ${r.approx}; exported as its bounding box.`);
        const g = this.groups.get(go);
        const effector = this.sc.component(go, 251);
        const oneWay = flag(c.data.m_UsedByEffector) && enabled(effector) && flag(effector.data.m_UseOneWay);
        raw.push({
          ...roundRect(r), tag: String(go.data.m_TagString ?? 'Untagged'), name: this.name(go),
          ...(g ? { group: g.group, ...(g.piece !== undefined ? { piece: g.piece } : {}) } : {}),
          ...(oneWay ? { oneWay: true } : {}),
        });
      }
    }
    for (const [reason, names] of skipped) {
      this.notes.push(`Skipped ${names.length} collider(s), ${reason}: ${this.summarize(names)}`);
    }
    const merged = mergeRects(raw, (r) => `${r.tag}|${r.group ?? ''}|${r.piece ?? ''}|${r.oneWay ?? ''}`).map(roundRectKeep);
    this.notes.push(`Solids: ${raw.length} colliders merged losslessly into ${merged.length} rectangles (same tag/group/oneWay only).`);
    // Stable, readable order: bottom to top, then left to right.
    return merged.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  findChild(go, p) {
    let tr = this.sc.transform(go);
    for (const part of p.split('/')) {
      tr = this.sc.childTransforms(tr).find((k) => this.name(this.sc.gameObject(k)) === part);
      if (!tr) return undefined;
    }
    return this.sc.gameObject(tr);
  }

  inactiveRoot(go) {
    let top;
    for (let tr = this.sc.transform(go); tr; tr = this.sc.parentTransform(tr)) {
      const g = this.sc.gameObject(tr);
      if (g && String(g.data.m_IsActive) === '0') top = g;
    }
    return top ? this.sc.pathOf(top) : this.name(go);
  }

  summarize(names) {
    const counts = new Map();
    for (const nm of names) counts.set(nm, (counts.get(nm) ?? 0) + 1);
    const parts = [...counts].map(([nm, c]) => (c > 1 ? `${nm} x${c}` : nm));
    return parts.length > 12 ? `${parts.slice(0, 12).join(', ')}, ... (${parts.length - 12} more)` : parts.join(', ');
  }

  run() {
    const { view, bgColor, camera } = this.view();
    const music = this.music();
    const props = this.props(); // first: assigns groups and consumes prop colliders
    const wraps = this.wraps();
    const layers = this.layers();
    const solids = this.solids();
    const spawns = this.spawns();
    const pickupSpawns = this.pickupSpawns();
    if (!wraps.length) this.notes.push('No LevelWrap components in this scene.');
    this.notes.push(`Camera '${camera.name}' at (${camera.x}, ${camera.y}), orthographic size ${camera.orthographicSize}; view assumes 16:9.`);
    return {
      id: this.def.id,
      name: this.def.name,
      source: `Assets/${this.def.scene}`,
      view,
      bgColor,
      ...(music ? { music } : {}),
      layers,
      solids,
      spawns,
      pickupSpawns,
      wraps,
      props,
      notes: [...new Set(this.notes)],
    };
  }
}

const roundRectKeep = (r) => ({ ...r, ...roundRect(r) });

// =============================================================================
// 6. Output
// =============================================================================

/** JSON with short objects/arrays kept on one line. */
function formatJson(value, indent = '') {
  const flat = JSON.stringify(value);
  if (flat === undefined) return 'null';
  if (value === null || typeof value !== 'object' || flat.length + indent.length <= 200) return flat;
  const next = `${indent}  `;
  if (Array.isArray(value)) {
    return `[\n${value.map((v) => next + formatJson(v, next)).join(',\n')}\n${indent}]`;
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return `{\n${entries.map(([k, v]) => `${next}${JSON.stringify(k)}: ${formatJson(v, next)}`).join(',\n')}\n${indent}}`;
}

export function extractAll() {
  const db = new AssetDb();
  return LEVELS.map((def) => new LevelExtractor(db, def).run());
}

function main() {
  const levels = extractAll();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const level of levels) {
    const file = path.join(OUT_DIR, `${level.id}.json`);
    fs.writeFileSync(file, `${formatJson(level)}\n`);
    console.log(`levels: ${path.relative(ROOT, file)}  layers=${level.layers.length} solids=${level.solids.length} ` +
      `spawns=${level.spawns.length} pickups=${level.pickupSpawns.length} wraps=${level.wraps.length} props=${level.props.length}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
