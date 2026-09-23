export interface Model3DTransform {
  posX: number; // horizontal offset in stage units
  posY: number; // vertical offset in stage units
  posZ: number; // depth offset in stage units
  rotX: number; // pitch in degrees
  rotY: number; // yaw in degrees
  rotZ: number; // roll in degrees
  scale: number; // scale multiplier (0.1 to 10.0)
  animationSpeed?: number;
  playAnimation?: boolean;
}

export const DEFAULT_MODEL_3D_TRANSFORM: Model3DTransform = {
  posX: 0,
  posY: 0,
  posZ: 0,
  rotX: 15,
  rotY: -25,
  rotZ: 0,
  scale: 1.0,
  animationSpeed: 1.0,
  playAnimation: true,
};

export interface Model3DKeyframe {
  id: string;
  time: number;
  transform: Model3DTransform;
}
