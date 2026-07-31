export interface LDrawMapping {
  bricks: Map<string, string>;
  materials: Map<string, string>;
  transforms: Map<string, PartCorrection>;
}

export interface PartCorrection {
  translation: [number, number, number];
  rotation: Mat3;
}

export interface LDConfigColor {
  code: string;
  hex: string;
}

export interface LxfmlPartInput {
  id: string;
  brickRef: string;
  partRef: string;
  designID: string;
  materialID: string;
  bone: number[];
}

export interface LxfmlBuildStep {
  index: number;
  refID: string;
  brickRefs: string[];
}

export interface CanonicalLxfmlPart {
  id: string;
  legoDesignID: string;
  legoMaterialID: string;
  ldrawPartId: string;
  ldrawColorCode: string;
  color: string;
  ldrawMatrix12: number[];
  sceneMatrix16: number[];
}

export interface CenteredLxfmlParts {
  parts: CanonicalLxfmlPart[];
  offset: { x: number; z: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null;
}

type Vec3 = [number, number, number];
type Mat3 = [[number, number, number], [number, number, number], [number, number, number]];

const AXES: Mat3 = [
  [1, 0, 0],
  [0, -1, 0],
  [0, 0, -1],
];

const IDENTITY3: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const LDRAW_TO_SCENE_SCALE = 0.05;

export function parseLDrawXml(xml: string): LDrawMapping {
  const bricks = new Map<string, string>();
  const materials = new Map<string, string>();
  const transforms = new Map<string, PartCorrection>();

  for (const tag of xml.matchAll(/<(Brick|Material|Transformation)\b([^>]*)\/?>/g)) {
    const attrs = parseAttrs(tag[2]);
    if (tag[1] === "Brick" && attrs.lego && attrs.ldraw) {
      bricks.set(attrs.lego, stripDat(attrs.ldraw));
    } else if (tag[1] === "Material" && attrs.lego && attrs.ldraw) {
      materials.set(attrs.lego, attrs.ldraw);
    } else if (tag[1] === "Transformation" && attrs.ldraw) {
      const tx = -num(attrs.tx);
      const ty = -num(attrs.ty);
      const tz = -num(attrs.tz);
      const ax = num(attrs.ax);
      const ay = num(attrs.ay);
      const az = num(attrs.az);
      const angle = -num(attrs.angle);
      transforms.set(stripDat(attrs.ldraw), {
        translation: [tx, ty, tz],
        rotation: axisAngleToMat3([ax, ay, az], angle),
      });
    }
  }

  return { bricks, materials, transforms };
}

export function parseLDConfigColors(text: string): Map<string, LDConfigColor> {
  const colors = new Map<string, LDConfigColor>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^0\s+!COLOUR\s+\S+.*\bCODE\s+(-?\d+)\b.*\bVALUE\s+(#[0-9A-Fa-f]{6})\b/);
    if (match) colors.set(match[1], { code: match[1], hex: match[2].toUpperCase() });
  }
  return colors;
}

export function parseLxfmlParts(lxfml: string): LxfmlPartInput[] {
  const parts: LxfmlPartInput[] = [];
  for (const brickMatch of lxfml.matchAll(/<Brick\b([^>]*)>([\s\S]*?)<\/Brick>/g)) {
    const brickAttrs = parseAttrs(brickMatch[1]);
    const brickBody = brickMatch[2];
    for (const partMatch of brickBody.matchAll(/<Part\b([^>]*)>([\s\S]*?)<\/Part>/g)) {
      const partAttrs = parseAttrs(partMatch[1]);
      const boneMatch = partMatch[2].match(/<Bone\b([^>]*)\/?>/);
      const transformation = boneMatch ? parseAttrs(boneMatch[1]).transformation : undefined;
      const designID = partAttrs.designID ?? brickAttrs.designID;
      const materialID = firstCsv(partAttrs.materials ?? partAttrs.materialID ?? brickAttrs.materials ?? brickAttrs.materialID);
      if (!designID || !materialID || !transformation) continue;
      const bone = transformation.split(",").map((v) => Number(v.trim()));
      if (bone.length < 12 || bone.some((v) => !Number.isFinite(v))) continue;
      const brickRef = brickAttrs.refID ?? `${parts.length}`;
      const partRef = partAttrs.refID ?? `${parts.length}`;
      parts.push({
        id: `lxf-b${brickRef}-p${partRef}`,
        brickRef,
        partRef,
        designID,
        materialID,
        bone: bone.slice(0, 12),
      });
    }
  }
  return parts;
}

export function parseLxfmlBuildSteps(lxfml: string): LxfmlBuildStep[] {
  const steps: LxfmlBuildStep[] = [];
  for (const stepMatch of lxfml.matchAll(/<Step\b([^>]*)>([\s\S]*?)<\/Step>/g)) {
    const attrs = parseAttrs(stepMatch[1]);
    const brickRefs: string[] = [];
    for (const inMatch of stepMatch[2].matchAll(/<In\b([^>]*)\/?>/g)) {
      const inAttrs = parseAttrs(inMatch[1]);
      const brickRef = inAttrs.brickRef ?? inAttrs.refID;
      if (brickRef) brickRefs.push(brickRef);
    }
    steps.push({
      index: steps.length,
      refID: attrs.refID ?? `${steps.length}`,
      brickRefs,
    });
  }
  return steps;
}

export function convertLxfmlPart(
  part: LxfmlPartInput,
  mapping: LDrawMapping,
  colors: Map<string, LDConfigColor>,
): CanonicalLxfmlPart | null {
  const ldrawPartId = mapping.bricks.get(part.designID) ?? part.designID;
  const ldrawColorCode = mapping.materials.get(part.materialID) ?? part.materialID;
  const color = colors.get(ldrawColorCode)?.hex ?? "#CC0000";
  const correction = mapping.transforms.get(ldrawPartId) ?? { translation: [0, 0, 0], rotation: IDENTITY3 };

  const [a, b, c, d, e, f, g, h, i, x, y, z] = part.bone;
  const lxfRot: Mat3 = [
    [a, d, g],
    [b, e, h],
    [c, f, i],
  ];
  const lxfPos: Vec3 = [x, y, z];
  const rot = matMul(lxfRot, correction.rotation);
  const ldrRot = matMul(matMul(AXES, rot), AXES);
  const correctedPos = vecAdd(lxfPos, matVecMul(rot, correction.translation));
  const ldrPos = vecScale(matVecMul(AXES, correctedPos), 25);

  const ldrawMatrix12 = [
    ldrRot[0][0], ldrRot[0][1], ldrRot[0][2],
    ldrRot[1][0], ldrRot[1][1], ldrRot[1][2],
    ldrRot[2][0], ldrRot[2][1], ldrRot[2][2],
    ldrPos[0], ldrPos[1], ldrPos[2],
  ];

  return {
    id: part.id,
    legoDesignID: part.designID,
    legoMaterialID: part.materialID,
    ldrawPartId,
    ldrawColorCode,
    color,
    ldrawMatrix12,
    sceneMatrix16: ldrawMatrix12ToSceneMatrix16(ldrawMatrix12),
  };
}

export function ldrawLineType1(part: CanonicalLxfmlPart): string {
  const [a, b, c, d, e, f, g, h, i, x, y, z] = part.ldrawMatrix12;
  return `1 ${part.ldrawColorCode} ${fmt(x)} ${fmt(y)} ${fmt(z)} ${fmt(a)} ${fmt(b)} ${fmt(c)} ${fmt(d)} ${fmt(e)} ${fmt(f)} ${fmt(g)} ${fmt(h)} ${fmt(i)} ${part.ldrawPartId}.dat`;
}

export function ldrawMatrix12ToSceneMatrix16(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i, x, y, z] = m;
  const sx = LDRAW_TO_SCENE_SCALE;
  const sy = -LDRAW_TO_SCENE_SCALE;
  const sz = LDRAW_TO_SCENE_SCALE;
  return [
    sx * a, sx * b, sx * c, sx * x,
    sy * d, sy * e, sy * f, sy * y,
    sz * g, sz * h, sz * i, sz * z,
    0, 0, 0, 1,
  ];
}

/**
 * Translate a converted LXFML model so its horizontal transform bounds are
 * centered on the requested scene point. Relative part transforms and Y are
 * left untouched. Both scene and canonical LDraw matrices are updated so
 * exports, full imports, and guided builds all use the same placement.
 */
export function centerCanonicalLxfmlParts(
  parts: CanonicalLxfmlPart[],
  targetX: number,
  targetZ: number,
): CenteredLxfmlParts {
  if (parts.length === 0) {
    return { parts: [], offset: { x: 0, z: 0 }, bounds: null };
  }

  const xs = parts.map((part) => part.sceneMatrix16[3]);
  const zs = parts.map((part) => part.sceneMatrix16[11]);
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
  const offset = {
    x: targetX - (bounds.minX + bounds.maxX) / 2,
    z: targetZ - (bounds.minZ + bounds.maxZ) / 2,
  };

  return {
    parts: parts.map((part) => {
      const sceneMatrix16 = [...part.sceneMatrix16];
      sceneMatrix16[3] += offset.x;
      sceneMatrix16[11] += offset.z;

      const ldrawMatrix12 = [...part.ldrawMatrix12];
      ldrawMatrix12[9] += offset.x / LDRAW_TO_SCENE_SCALE;
      ldrawMatrix12[11] += offset.z / LDRAW_TO_SCENE_SCALE;

      return { ...part, sceneMatrix16, ldrawMatrix12 };
    }),
    offset,
    bounds,
  };
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of source.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

function firstCsv(value: string | undefined): string | undefined {
  return value?.split(",")[0]?.trim();
}

function stripDat(value: string): string {
  return value.replace(/\\/g, "/").replace(/^parts\//i, "").replace(/\.dat$/i, "");
}

function num(value: string | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function axisAngleToMat3(axis: Vec3, angle: number): Mat3 {
  const len = Math.hypot(axis[0], axis[1], axis[2]);
  if (len === 0 || angle === 0) return IDENTITY3;
  const x = axis[0] / len;
  const y = axis[1] / len;
  const z = axis[2] / len;
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const t = 1 - c;
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
  ];
}

function matMul(left: Mat3, right: Mat3): Mat3 {
  return [
    [
      left[0][0] * right[0][0] + left[0][1] * right[1][0] + left[0][2] * right[2][0],
      left[0][0] * right[0][1] + left[0][1] * right[1][1] + left[0][2] * right[2][1],
      left[0][0] * right[0][2] + left[0][1] * right[1][2] + left[0][2] * right[2][2],
    ],
    [
      left[1][0] * right[0][0] + left[1][1] * right[1][0] + left[1][2] * right[2][0],
      left[1][0] * right[0][1] + left[1][1] * right[1][1] + left[1][2] * right[2][1],
      left[1][0] * right[0][2] + left[1][1] * right[1][2] + left[1][2] * right[2][2],
    ],
    [
      left[2][0] * right[0][0] + left[2][1] * right[1][0] + left[2][2] * right[2][0],
      left[2][0] * right[0][1] + left[2][1] * right[1][1] + left[2][2] * right[2][1],
      left[2][0] * right[0][2] + left[2][1] * right[1][2] + left[2][2] * right[2][2],
    ],
  ];
}

function matVecMul(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vecScale(v: Vec3, scale: number): Vec3 {
  return [v[0] * scale, v[1] * scale, v[2] * scale];
}

function fmt(value: number): string {
  return Number(value.toFixed(6)).toString();
}
