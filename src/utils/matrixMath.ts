import { Camera3DState } from './camera3D';

export function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

// 4x4 Matrix multiplication: C = A * B
export function mat4Multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[row + k * 4] * b[k + col * 4];
      }
      out[row + col * 4] = sum;
    }
  }
  return out;
}

export function mat4Identity(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

export function mat4Translate(x: number, y: number, z: number): Float32Array {
  const m = mat4Identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

export function mat4Scale(x: number, y: number, z: number): Float32Array {
  const m = mat4Identity();
  m[0] = x;
  m[5] = y;
  m[10] = z;
  return m;
}

export function mat4RotateX(rad: number): Float32Array {
  const m = mat4Identity();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}

export function mat4RotateY(rad: number): Float32Array {
  const m = mat4Identity();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
}

export function mat4RotateZ(rad: number): Float32Array {
  const m = mat4Identity();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}

export function mat4Perspective(d: number): Float32Array {
  const m = mat4Identity();
  if (d && d > 0) {
    m[11] = -1 / d;
  }
  return m;
}

export function getCSSTransformMatrix(camera: Camera3DState, baseScale = 1): Float32Array {
  const { rotX, rotY, rotZ, zoom, panX, panY, perspective = 1000 } = camera;
  const d = perspective * baseScale;

  const T_pan = mat4Translate(panX * baseScale, panY * baseScale, 0);
  const S_zoom = mat4Scale(zoom, zoom, 1);
  const R_x = mat4RotateX(degToRad(rotX));
  const R_y = mat4RotateY(degToRad(rotY));
  const R_z = mat4RotateZ(degToRad(rotZ));
  const P = mat4Perspective(d);

  let model = mat4Multiply(T_pan, S_zoom);
  model = mat4Multiply(model, R_x);
  model = mat4Multiply(model, R_y);
  model = mat4Multiply(model, R_z);

  return mat4Multiply(P, model);
}
