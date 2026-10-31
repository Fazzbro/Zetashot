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
uniform vec2 u_rotation; // (rotX, rotY) in radians
uniform float u_blurAmount; // blur slider value (0.0 to 50.0+)
uniform vec2 u_resolution; // (frameW, frameH) in physical pixels
uniform vec2 u_focusPoint; // (fx, fy) normalized [0..1]
uniform float u_cornerRadius; // corner radius in physical pixels
uniform float u_unblurFactor; // 0.0 = completely unblurred (tack sharp), 1.0 = full depth blur
varying vec2 v_texCoord;

void main() {
  // Exact 2D Rounded-Rectangle Signed Distance Function in physical frame pixels
  vec2 halfSize = u_resolution * 0.5;
  vec2 p = abs((v_texCoord - 0.5) * u_resolution) - (halfSize - vec2(u_cornerRadius));
  float cornerDist = length(max(p, 0.0)) + min(0.0, max(p.x, p.y)) - u_cornerRadius;
  float cornerAlpha = clamp(0.5 - cornerDist, 0.0, 1.0);
  if (cornerAlpha <= 0.001) {
    discard;
  }

  float sinX = sin(u_rotation.x);
  float sinY = sin(u_rotation.y);
  
  // 1. Physically-based 3D Distance along camera optical axis Z:
  // Relative to focus point on the focal plane:
  float zPixel = -(v_texCoord.y - u_focusPoint.y) * sinX + (v_texCoord.x - u_focusPoint.x) * sinY;
  float totalTilt = sqrt(sinX * sinX + sinY * sinY);

  float blurFactor = 0.0;

  if (totalTilt > 0.015) {
    // True two-sided optical depth-of-field:
    // Both receding and advancing regions blur symmetrically away from the focal plane
    float absZ = abs(zPixel);
    
    // In-focus optical corridor: generous area around focal point remains tack-sharp (0% blur)
    // Dynamic rack-focus expansion: corridor expands as unblurFactor drops to 0
    float focalCorridor = 0.05 + (1.0 - u_unblurFactor) * 0.15;
    float zDist = max(0.0, absZ - focalCorridor);
    float normDist = clamp(zDist / (0.35 * totalTilt + 0.001), 0.0, 1.0);
    
    // Silky smooth Hermite optical roll-off into creamy bokeh
    float tiltBlur = normDist * normDist * (3.0 - 2.0 * normDist);
    
    // Subtle peripheral aperture falloff on distant edges
    float radialDist = length(v_texCoord - u_focusPoint);
    float radialAperture = smoothstep(0.35, 0.95, radialDist);
    
    blurFactor = max(tiltBlur, radialAperture * 0.35 * tiltBlur);
  } else {
    // Flat 2D View: Prime Lens Macro Bokeh
    // Generous sweet spot centered at the focus point
    float radialDist = length(v_texCoord - u_focusPoint);
    float focalRadius = 0.25 + (1.0 - u_unblurFactor) * 0.25;
    blurFactor = smoothstep(focalRadius, focalRadius + 0.55, radialDist);
  }

  // Gradual unblur factor: resolves smoothly to 0.0 as camera settles on focused region
  blurFactor *= clamp(u_unblurFactor, 0.0, 1.0);

  // Optical Aperture Circle of Confusion (CoC):
  // Non-linear power curve provides subtle, velvety depth at low values
  // and rich, creamy cinematic bokeh at higher values without destructive noise or over-blurring.
  float normBlur = clamp(u_blurAmount / 50.0, 0.0, 1.0);
  float opticalAperture = pow(normBlur, 1.35);
  float maxBokehRadius = 24.0;
  float blurRadius = opticalAperture * blurFactor * maxBokehRadius;

  vec4 finalColor = vec4(0.0);

  if (blurRadius < 0.20) {
    finalColor = texture2D(u_texture, v_texCoord);
  } else {
    vec2 texelSize = vec2(1.0 / max(1.0, u_resolution.x), 1.0 / max(1.0, u_resolution.y));
    float totalWeight = 0.0;
    const float GOLDEN_ANGLE = 2.39996323;
    const int SAMPLES = 16;

    // Subtle anamorphic chromatic dispersion on bokeh periphery
    float chromaDisp = min(1.6, blurRadius * 0.04);

    for (int i = 0; i < SAMPLES; i++) {
      float fi = float(i) + 0.5;
      float r = sqrt(fi / float(SAMPLES)) * blurRadius;
      float theta = fi * GOLDEN_ANGLE;
      vec2 dir = vec2(cos(theta), sin(theta));
      
      vec2 offset = dir * r * texelSize;
      vec2 offsetR = dir * (r + chromaDisp) * texelSize;
      vec2 offsetB = dir * max(0.0, r - chromaDisp) * texelSize;

      vec2 coordG = clamp(v_texCoord + offset, vec2(0.001), vec2(0.999));
      vec2 coordR = clamp(v_texCoord + offsetR, vec2(0.001), vec2(0.999));
      vec2 coordB = clamp(v_texCoord + offsetB, vec2(0.001), vec2(0.999));

      vec4 sampleG = texture2D(u_texture, coordG);
      float sampleR = texture2D(u_texture, coordR).r;
      float sampleB = texture2D(u_texture, coordB).b;

      // Bokeh highlight expansion: bright specular elements expand into luminous bokeh discs
      float luma = dot(sampleG.rgb, vec3(0.299, 0.587, 0.114));
      float highlightWeight = 1.0 + pow(luma, 2.8) * 1.8;

      // Optical Gaussian-Hermite disc weighting (smooth core with soft circular aperture rim)
      float normalizedR = r / (blurRadius + 0.001);
      float w = exp(-normalizedR * normalizedR * 1.8) * highlightWeight;

      finalColor.r += sampleR * w;
      finalColor.g += sampleG.g * w;
      finalColor.b += sampleB * w;
      finalColor.a += sampleG.a * w;
      totalWeight += w;
    }

    finalColor /= max(0.0001, totalWeight);
  }

  // Dynamic glass sheen sweep reacting to 3D rotation
  vec2 lightPos = vec2(0.4 + sinY * 0.35, 0.3 - sinX * 0.35);
  float distToLight = abs((v_texCoord.x * 0.65 + v_texCoord.y * 0.75) - (lightPos.x * 0.65 + lightPos.y * 0.75));
  float sheen = exp(-distToLight * distToLight * 24.0) * 0.05 * (1.0 - blurFactor * 0.5);

  // Peripheral bezel fresnel highlight
  float edgeDist = min(min(v_texCoord.x, 1.0 - v_texCoord.x), min(v_texCoord.y, 1.0 - v_texCoord.y));
  float fresnel = (1.0 - smoothstep(0.0, 0.06, edgeDist)) * 0.04;

  vec3 litRgb = finalColor.rgb + vec3(sheen + fresnel);

  // High-end dark border frame & crisp specular edge rim
  float borderDist = clamp(-cornerDist, 0.0, 3.5);
  float darkBezelFactor = smoothstep(2.5, 0.0, borderDist) * 0.85;
  vec3 darkBezelColor = vec3(0.05, 0.07, 0.09);

  // Specular highlight line along inner rim (-3.0px to -1.2px)
  float specularRim = smoothstep(3.2, 2.0, borderDist) * (1.0 - smoothstep(2.0, 0.8, borderDist)) * 0.16;

  vec3 framedColor = mix(litRgb, darkBezelColor, darkBezelFactor) + vec3(specularRim);
  float outAlpha = finalColor.a * cornerAlpha * u_opacity;
  gl_FragColor = vec4(framedColor * outAlpha, outAlpha);
}
`;

export class WebGL3DRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private uMatrixLocation: WebGLUniformLocation | null = null;
  private uOpacityLocation: WebGLUniformLocation | null = null;
  private uRotationLocation: WebGLUniformLocation | null = null;
  private uBlurAmountLocation: WebGLUniformLocation | null = null;
  private uResolutionLocation: WebGLUniformLocation | null = null;
  private uFocusPointLocation: WebGLUniformLocation | null = null;
  private uCornerRadiusLocation: WebGLUniformLocation | null = null;
  private uUnblurFactorLocation: WebGLUniformLocation | null = null;
  private isFallback2D: boolean = false;
  private ctx2d: CanvasRenderingContext2D | null = null;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    // Multi-tier WebGL context acquisition (strict -> standard -> lenient -> experimental)
    const contextOptionsList: WebGLContextAttributes[] = [
      { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true },
      { alpha: true, preserveDrawingBuffer: true },
      { alpha: true },
      {},
    ];

    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    for (const opts of contextOptionsList) {
      try {
        gl = (this.canvas.getContext('webgl2', opts) ||
          this.canvas.getContext('webgl', opts) ||
          this.canvas.getContext('experimental-webgl', opts)) as WebGLRenderingContext | WebGL2RenderingContext | null;
        if (gl) break;
      } catch {}
    }

    if (gl) {
      try {
        // Compile shaders
        const vs = this.compileShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
        const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
        const program = gl.createProgram()!;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw new Error(`WebGL program link error: ${gl.getProgramInfoLog(program)}`);
        }
        this.program = program;
        this.gl = gl;

        this.uMatrixLocation = gl.getUniformLocation(program, 'u_matrix');
        this.uOpacityLocation = gl.getUniformLocation(program, 'u_opacity');
        this.uRotationLocation = gl.getUniformLocation(program, 'u_rotation');
        this.uBlurAmountLocation = gl.getUniformLocation(program, 'u_blurAmount');
        this.uResolutionLocation = gl.getUniformLocation(program, 'u_resolution');
        this.uFocusPointLocation = gl.getUniformLocation(program, 'u_focusPoint');
        this.uCornerRadiusLocation = gl.getUniformLocation(program, 'u_cornerRadius');
        this.uUnblurFactorLocation = gl.getUniformLocation(program, 'u_unblurFactor');

        // Quad positions: Triangle Strip (-1,-1), (1,-1), (-1,1), (1,1)
        const positions = new Float32Array([
          -1, -1,
           1, -1,
          -1,  1,
           1,  1,
        ]);
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // TexCoords: (0,0), (1,0), (0,1), (1,1)
        const texCoords = new Float32Array([
          0, 0,
          1, 0,
          0, 1,
          1, 1,
        ]);
        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        // Texture setup
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        this.isFallback2D = false;
        console.log('[WebGL3DRenderer] Hardware WebGL pipeline initialized successfully.');
      } catch (shaderErr) {
        console.warn('[WebGL3DRenderer] WebGL shader compilation error, engaging Canvas 2D fallback:', shaderErr);
        gl = null;
        this.gl = null;
        this.program = null;
      }
    }

    if (!gl) {
      // High-Reliability Canvas 2D Perspective Fallback
      console.warn('[WebGL3DRenderer] WebGL unavailable. Engaging Canvas 2D perspective fallback engine.');
      this.isFallback2D = true;
      this.ctx2d = this.canvas.getContext('2d');
    }
  }

  private compileShader(gl: WebGLRenderingContext | WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
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
    opacity: number = 1.0,
    blurAmount: number = 0.0,
    focusPoint?: { x: number; y: number },
    cornerRadius: number = 0,
    unblurFactor: number = 1.0
  ): void {
    if (this.isFallback2D || !this.gl || !this.program) {
      if (!this.ctx2d) {
        this.ctx2d = this.canvas.getContext('2d');
      }
      const ctx = this.ctx2d;
      if (!ctx) return;

      const width = this.canvas.width;
      const height = this.canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

      // 1. Center Translation + Pan
      const cx = width / 2 + (camera.panX || 0) * baseScale;
      const cy = height / 2 + (camera.panY || 0) * baseScale;
      ctx.translate(cx, cy);

      // 2. Camera Zoom
      const zoom = camera.zoom || 1.0;
      ctx.scale(zoom, zoom);

      // 3. Roll (rotZ)
      if (camera.rotZ) {
        ctx.rotate(degToRad(camera.rotZ));
      }

      // 4. Perspective Foreshortening & Shear for Pitch (rotX) and Yaw (rotY)
      const radX = degToRad(camera.rotX || 0);
      const radY = degToRad(camera.rotY || 0);
      const cosX = Math.cos(radX);
      const cosY = Math.cos(radY);
      const sinX = Math.sin(radX);
      const sinY = Math.sin(radY);

      // 2.5D affine transform matrix replicating 3D perspective foreshortening & shear
      ctx.transform(cosY, -sinY * 0.32, sinX * 0.32, cosX, 0, 0);

      // 5. Blur filter if applicable with gradual unblur
      if (blurAmount > 0) {
        const effBlur = blurAmount * baseScale * 0.45 * (typeof unblurFactor === 'number' ? unblurFactor : 1.0);
        if (effBlur > 0.2) {
          ctx.filter = `blur(${Math.min(24, effBlur)}px)`;
        }
      }

      // 6. Draw content centered with corner radius clipping
      if (cornerRadius > 0 && typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(-frameW / 2, -frameH / 2, frameW, frameH, cornerRadius);
        ctx.clip();
      }
      ctx.drawImage(source as CanvasImageSource, -frameW / 2, -frameH / 2, frameW, frameH);
      ctx.restore();
      return;
    }

    const gl = this.gl;
    const width = this.canvas.width;
    const height = this.canvas.height;

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);

    // Upload source texture
    if (this.texture) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }

    // Bind position buffer
    if (this.positionBuffer) {
      const posLoc = gl.getAttribLocation(this.program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // Bind texCoord buffer
    if (this.texCoordBuffer) {
      const texLoc = gl.getAttribLocation(this.program, 'a_texCoord');
      gl.enableVertexAttribArray(texLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    }

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

    if (this.uMatrixLocation) gl.uniformMatrix4fv(this.uMatrixLocation, false, M);
    if (this.uOpacityLocation) gl.uniform1f(this.uOpacityLocation, opacity);
    if (this.uRotationLocation) {
      gl.uniform2f(this.uRotationLocation, degToRad(camera.rotX), degToRad(camera.rotY));
    }
    if (this.uBlurAmountLocation) {
      gl.uniform1f(this.uBlurAmountLocation, (blurAmount || 0) * baseScale);
    }
    if (this.uResolutionLocation) {
      gl.uniform2f(this.uResolutionLocation, frameW, frameH);
    }
    if (this.uFocusPointLocation) {
      const fx = focusPoint ? Math.max(0, Math.min(1, focusPoint.x)) : 0.5;
      const fy = focusPoint ? Math.max(0, Math.min(1, focusPoint.y)) : 0.5;
      gl.uniform2f(this.uFocusPointLocation, fx, fy);
    }
    if (this.uCornerRadiusLocation) {
      gl.uniform1f(this.uCornerRadiusLocation, Math.max(0, cornerRadius));
    }
    if (this.uUnblurFactorLocation) {
      gl.uniform1f(this.uUnblurFactorLocation, typeof unblurFactor === 'number' ? Math.max(0, Math.min(1, unblurFactor)) : 1.0);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
  }

  public destroy(): void {
    if (this.isFallback2D) {
      this.ctx2d = null;
      return;
    }
    const gl = this.gl;
    if (!gl) return;
    try {
      if (this.program) gl.deleteProgram(this.program);
      if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
      if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
      if (this.texture) gl.deleteTexture(this.texture);
    } catch {}
  }
}
