import type { BrickDefinition } from './bricks/types';
export type { BrickDefinition };
export type BrickType = BrickDefinition;

export interface BrickInstance {
  id: string;
  typeId: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  color: string;
  transform?: BrickTransform;
}

export interface BrickTransform {
  format: 'matrix12' | 'matrix16';
  /**
   * matrix12 uses LDraw line-type-1 order:
   * a,b,c,d,e,f,g,h,i,x,y,z.
   * matrix16 uses row-major 4x4 order for Three.js Matrix4.set().
   */
  matrix: number[];
  units: 'scene' | 'ldd';
}

export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export interface SceneData {
  name: string;
  bricks: BrickInstance[];
  camera?: CameraState;
  dynamicTypes?: Record<string, BrickDefinition>;
  buildMode?: 'strict' | 'relaxed';
  snap?: boolean;
}

export interface ScenePayload {
  scene: SceneData;
  message?: string;
}

export interface AABB {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

export type InteractionMode = 'look' | 'place' | 'select' | 'move' | 'rotate' | 'delete' | 'paint';
