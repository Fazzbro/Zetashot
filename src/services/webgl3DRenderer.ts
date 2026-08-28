import { Camera3DState } from '../utils/camera3D';

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function mat4Identity(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

function mat4Multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + i] * b[j * 4 + k];
      }
      out[j * 4 + i] = sum;
    }
  }
  return out;
}

function mat4Translate(x: number, y: number, z: number): Float32Array {
  const m = mat4Identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

function mat4Scale(x: number, y: number, z: number): Float32Array {
  const m = mat4Identity();
  m[0] = x;
  m[5] = y;
  m[10] = z;
  return m;
}

function mat4RotateX(rad: number): Float32Array {
  const m = mat4Identity();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}

function mat4RotateY(rad: number): Float32Array {
  const m = mat4Identity();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
}

function mat4RotateZ(rad: number): Float32Array {
  const m = mat4Identity();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  m[0] = c;
  m[1] = s;
  m[4] = -s;
  m[5] = c;
  return m;
}

function mat4Perspective(d: number): Float32Array {
  const m = mat4Identity();
  if (d && d > 0) {
    m[11] = -1 / d;
  }
  return m;
}

function mat4Ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Float32Array {
  const m = mat4Identity();
  m[0] = 2 / (right - left);
  m[5] = 2 / (top - bottom);
  m[10] = -2 / (far - near);
  m[12] = -(right + left) / (right - left);
  m[13] = -(top + bottom) / (top - bottom);
  m[14] = -(far + near) / (far - near);
  return m;
}

const VS_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
uniform mat4 u_matrix;
varying vec2 v_texCoord;

void main() {
  gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const FS_SOURCE = `
precision highp float;
uniform sampler2D u_texture;
uniform float u_opacity;
uniform vec2 u_rotation;
varying vec2 v_texCoord;

void main() {
  vec4 texColor = texture2D(u_texture, v_texCoord);

  // Dynamic glass sheen sweep reacting to 3D rotation
  float sinX = sin(u_rotation.x);
  float sinY = sin(u_rotation.y);
  vec2 lightPos = vec2(0.4 + sinY * 0.35, 0.3 - sinX * 0.35);
  float distToLight = abs((v_texCoord.x * 0.65 + v_texCoord.y * 0.75) - (lightPos.x * 0.65 + lightPos.y * 0.75));
  float sheen = exp(-distToLight * distToLight * 24.0) * 0.05;

  // Peripheral bezel fresnel highlight
  float edgeDist = min(min(v_texCoord.x, 1.0 - v_texCoord.x), min(v_texCoord.y, 1.0 - v_texCoord.y));
  float fresnel = (1.0 - smoothstep(0.0, 0.06, edgeDist)) * 0.04;

  vec3 litRgb = texColor.rgb + vec3(sheen + fresnel);
  gl_FragColor = vec4(litRgb * u_opacity, texColor.a * u_opacity);
}
`;

export class WebGL3DRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private program: WebGLProgram;
  private positionBuffer: WebGLBuffer;
  private texCoordBuffer: WebGLBuffer;
  private texture: WebGLTexture;
  private uMatrixLocation: WebGLUniformLocation;
  private uOpacityLocation: WebGLUniformLocation;
  private uRotationLocation: WebGLUniformLocation;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    const gl =
      this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true }) ||
      this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });

    if (!gl) {
      throw new Error('WebGL is not supported in this environment');
    }
    this.gl = gl;

    // Compile shaders
    const vs = this.compileShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`WebGL program link error: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    this.uMatrixLocation = gl.getUniformLocation(program, 'u_matrix')!;
    this.uOpacityLocation = gl.getUniformLocation(program, 'u_opacity')!;
    this.uRotationLocation = gl.getUniformLocation(program, 'u_rotation')!;

    // Quad positions: Triangle Strip (-1,-1), (1,-1), (-1,1), (1,1)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    this.positionBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // TexCoords: (0,0), (1,0), (0,1), (1,1)
    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]);
    this.texCoordBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    // Texture setup
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public render(
    source: TexImageSource,
    frameW: number,
    frameH: number,
    camera: Camera3DState,
    baseScale: number = 1,
    opacity: number = 1.0
  ): void {
    const gl = this.gl;
    const width = this.canvas.width;
    const height = this.canvas.height;

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);

    // Upload source texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    // Bind position buffer
    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Bind texCoord buffer
    const texLoc = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    // Build 4x4 matrix matching CSS 3D transform exactly:
    // Screen origin is top-left (0,0), Y points down
    const P_ortho = mat4Ortho(0, width, height, 0, -2000, 2000);
    const T_center = mat4Translate(width / 2, height / 2, 0);
    const P_persp = mat4Perspective((camera.perspective || 1000) * baseScale);
    const T_pan = mat4Translate((camera.panX || 0) * baseScale, (camera.panY || 0) * baseScale, 0);
    const S_zoom = mat4Scale(camera.zoom, camera.zoom, 1);
    const R_x = mat4RotateX(degToRad(camera.rotX));
    const R_y = mat4RotateY(degToRad(camera.rotY));
    const R_z = mat4RotateZ(degToRad(camera.rotZ));
    const S_quad = mat4Scale(frameW / 2, frameH / 2, 1);

    // Multiplication: P_ortho * T_center * P_persp * T_pan * S_zoom * R_x * R_y * R_z * S_quad
    let M = mat4Multiply(P_ortho, T_center);
    M = mat4Multiply(M, P_persp);
    M = mat4Multiply(M, T_pan);
    M = mat4Multiply(M, S_zoom);
    M = mat4Multiply(M, R_x);
    M = mat4Multiply(M, R_y);
    M = mat4Multiply(M, R_z);
    M = mat4Multiply(M, S_quad);

    gl.uniformMatrix4fv(this.uMatrixLocation, false, M);
    gl.uniform1f(this.uOpacityLocation, opacity);
    if (this.uRotationLocation) {
      gl.uniform2f(this.uRotationLocation, degToRad(camera.rotX), degToRad(camera.rotY));
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  public destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.texCoordBuffer);
    gl.deleteTexture(this.texture);
  }
}
