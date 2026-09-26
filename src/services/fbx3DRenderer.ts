import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
  Model3DTransform,
  Model3DTextureConfig,
  Model3DTextureMapType,
  DEFAULT_MODEL_3D_TEXTURES,
} from '../types/model3D';

export class FBX3DRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private modelRoot: THREE.Group;
  private mixer: THREE.AnimationMixer | null = null;
  private animationDuration = 0;
  private currentModelUrl: string | null = null;
  private loader: FBXLoader;
  private gltfLoader: GLTFLoader;
  private objLoader: OBJLoader;
  private textureLoader: THREE.TextureLoader;
  private loadedTextures: Map<Model3DTextureMapType, THREE.Texture> = new Map();
  private activeTextureConfig: Model3DTextureConfig = { ...DEFAULT_MODEL_3D_TEXTURES };
  private isDisposed = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(42, 1920 / 1080, 0.1, 1000);
    this.camera.position.set(0, 0, 7.5);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setSize(1920, 1080, false);
      this.renderer.setPixelRatio(1);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
    } catch {
      // Mock minimal renderer interface for headless / test environments without native WebGL
      this.renderer = {
        render: () => {},
        setSize: () => {},
        setPixelRatio: () => {},
        setClearColor: () => {},
        dispose: () => {},
      } as unknown as THREE.WebGLRenderer;
    }

    // 1. Balanced Studio Lighting Rig (No blown-out glares)
    this.setupLighting();

    // 2. Root group for loaded model
    this.modelRoot = new THREE.Group();
    this.scene.add(this.modelRoot);

    this.loader = new FBXLoader();
    this.gltfLoader = new GLTFLoader();
    this.objLoader = new OBJLoader();
    this.textureLoader = new THREE.TextureLoader();

    // Initialize with a sleek procedural 3D model until an external 3D file is loaded
    this.buildDefaultProceduralModel();
  }

  private setupLighting() {
    // Ambient soft base
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    this.scene.add(ambientLight);

    // Key Light (gentle warm high front-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(5, 7, 7);
    this.scene.add(keyLight);

    // Fill Light (soft cool left)
    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 0.95);
    fillLight.position.set(-5, 3, 5);
    this.scene.add(fillLight);

    // Rim Light (subtle contour)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.65);
    rimLight.position.set(0, -4, -6);
    this.scene.add(rimLight);
  }

  private createScreenTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark sleek UI interface
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, 1024, 2048);

      // Status Bar
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Inter, sans-serif';
      ctx.fillText('9:41', 80, 110);

      // Header card
      const grad = ctx.createLinearGradient(60, 180, 964, 520);
      grad.addColorStop(0, '#18181b');
      grad.addColorStop(1, '#27272a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(60, 180, 904, 340, [32]);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px Inter, sans-serif';
      ctx.fillText('Zetashot Studio', 110, 300);
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '500 36px Inter, sans-serif';
      ctx.fillText('Interactive 3D Viewport', 110, 375);

      // Clean metric cards
      const titles = ['60 FPS High Precision', 'Discrete CFR Render', 'Cinema Depth Bokeh'];
      const subs = ['Hardware-Accelerated WebGL', 'Frame-Accurate Video Export', 'f/1.4 Optical Aperture Curve'];
      for (let i = 0; i < 3; i++) {
        const y = 580 + i * 300;
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.roundRect(60, y, 904, 250, [26]);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px Inter, sans-serif';
        ctx.fillText(titles[i], 110, y + 105);
        ctx.fillStyle = '#71717a';
        ctx.font = '400 32px Inter, sans-serif';
        ctx.fillText(subs[i], 110, y + 175);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }

  /**
   * Builds an ultra-clean procedural 3D device model to serve as default
   * or fallback if no external FBX file is loaded.
   */
  private buildDefaultProceduralModel() {
    this.clearModel();

    const deviceGroup = new THREE.Group();

    // Chassis body: Dark Titanium with subtle metallic sheen
    const bodyGeo = new THREE.BoxGeometry(2.35, 4.75, 0.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.75,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    deviceGroup.add(body);

    // Glass Screen Front with sleek interface texture
    const screenGeo = new THREE.PlaneGeometry(2.2, 4.6);
    const screenTexture = this.createScreenTexture();
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      metalness: 0.2,
      roughness: 0.3,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.z = 0.105;
    deviceGroup.add(screen);

    // Camera island on back
    const cameraBmpGeo = new THREE.BoxGeometry(0.75, 0.75, 0.06);
    const cameraBmpMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const cameraBump = new THREE.Mesh(cameraBmpGeo, cameraBmpMat);
    cameraBump.position.set(-0.6, 1.8, -0.13);
    deviceGroup.add(cameraBump);

    // Dual camera lenses
    const lensGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 32);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      metalness: 0.95,
      roughness: 0.08,
    });
    const lens1 = new THREE.Mesh(lensGeo, lensMat);
    lens1.rotation.x = Math.PI / 2;
    lens1.position.set(-0.6, 2.0, -0.16);
    deviceGroup.add(lens1);

    const lens2 = new THREE.Mesh(lensGeo, lensMat);
    lens2.rotation.x = Math.PI / 2;
    lens2.position.set(-0.6, 1.6, -0.16);
    deviceGroup.add(lens2);

    this.modelRoot.add(deviceGroup);
  }

  /**
   * Check if current loaded 3D model has active skeletal or clip animations
   */
  public hasAnimation(): boolean {
    return this.mixer !== null && this.animationDuration > 0;
  }

  /**
   * Loads a 3D model (FBX, GLTF, GLB, OBJ) from a File blob, ArrayBuffer, or URL.
   */
  public async loadModel(source: string | ArrayBuffer, fileNameOrFormat?: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const onLoaded = (object: THREE.Object3D, animations?: THREE.AnimationClip[]) => {
          this.clearModel();

          // Auto-normalize bounding box scale and center
          const box = new THREE.Box3().setFromObject(object);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z);
          const targetScale = maxDim > 0.0001 ? 3.5 / maxDim : 1.0;

          // Re-center geometry
          object.position.x = -center.x * targetScale;
          object.position.y = -center.y * targetScale;
          object.position.z = -center.z * targetScale;
          object.scale.setScalar(targetScale);

          // Wrap in pivot group
          const pivot = new THREE.Group();
          pivot.add(object);

          // Setup materials and shadows safely
          object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach((m) => {
                    m.side = THREE.DoubleSide;
                  });
                } else {
                  mesh.material.side = THREE.DoubleSide;
                }
              }
            }
          });

          // Animation Mixer setup
          const activeAnims = animations || object.animations;
          if (activeAnims && activeAnims.length > 0) {
            this.mixer = new THREE.AnimationMixer(object);
            const action = this.mixer.clipAction(activeAnims[0]);
            action.play();
            this.animationDuration = activeAnims[0].duration;
          } else {
            this.mixer = null;
            this.animationDuration = 0;
          }

          this.modelRoot.add(pivot);
          this.reapplyTexturesToActiveModel();
          resolve();
        };

        const fallback = (err: unknown) => {
          console.warn('[3DRenderer] Error loading 3D file, falling back to default procedural model:', err);
          this.buildDefaultProceduralModel();
          resolve();
        };

        if (typeof source === 'string') {
          this.currentModelUrl = source;
          const lower = source.toLowerCase();
          if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
            this.gltfLoader.load(source, (gltf) => onLoaded(gltf.scene, gltf.animations), undefined, fallback);
          } else if (lower.endsWith('.obj')) {
            this.objLoader.load(source, (obj) => onLoaded(obj), undefined, fallback);
          } else {
            this.loader.load(source, (obj) => onLoaded(obj, obj.animations), undefined, fallback);
          }
        } else {
          // Detect format from buffer or filename hint
          const fn = (fileNameOrFormat || '').toLowerCase();
          const bytes = new Uint8Array(source.slice(0, 4));
          const isGlb = bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46; // 'glTF'

          if (isGlb || fn.endsWith('.glb') || fn.endsWith('.gltf')) {
            this.gltfLoader.parse(
              source,
              '',
              (gltf) => onLoaded(gltf.scene, gltf.animations),
              fallback
            );
          } else if (fn.endsWith('.obj')) {
            const text = new TextDecoder().decode(source);
            const obj = this.objLoader.parse(text);
            onLoaded(obj);
          } else {
            // Default to FBX parsing
            const parsed = this.loader.parse(source, '');
            onLoaded(parsed, parsed.animations);
          }
        }
      } catch (err) {
        console.warn('[3DRenderer] Error parsing 3D file:', err);
        this.buildDefaultProceduralModel();
        resolve();
      }
    });
  }

  /**
   * Backwards-compatible alias for loadModel
   */
  public async loadFBX(source: string | ArrayBuffer, fileNameOrFormat?: string): Promise<void> {
    return this.loadModel(source, fileNameOrFormat);
  }

  /**
   * Applies all active texture maps and color tints to the current model meshes.
   */
  public reapplyTexturesToActiveModel(): void {
    if (this.loadedTextures.has('diffuse')) {
      this.applyTextureToMeshes(this.loadedTextures.get('diffuse')!, 'diffuse');
    }
    if (this.loadedTextures.has('normal')) {
      this.applyTextureToMeshes(this.loadedTextures.get('normal')!, 'normal');
    }
    if (this.loadedTextures.has('roughness')) {
      this.applyTextureToMeshes(this.loadedTextures.get('roughness')!, 'roughness');
    }
    if (this.activeTextureConfig.colorTint && this.activeTextureConfig.colorTint !== '#ffffff') {
      this.applyColorTint(this.activeTextureConfig.colorTint);
    }
  }

  /**
   * Internal helper to apply a THREE.Texture to all meshes in the loaded model.
   */
  private applyTextureToMeshes(texture: THREE.Texture, type: Model3DTextureMapType): void {
    this.modelRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            if (type === 'diffuse') {
              (mat as any).map = texture;
              // Ensure diffuse texture is visible: If base color is black/very dark, brighten to white or tint
              if ('color' in mat && (mat as any).color) {
                if (this.activeTextureConfig.colorTint && this.activeTextureConfig.colorTint !== '#ffffff') {
                  (mat as any).color.set(this.activeTextureConfig.colorTint);
                } else if ((mat as any).color.getHex() === 0x000000) {
                  (mat as any).color.setHex(0xffffff);
                }
              }
            } else if (type === 'normal') {
              if ('normalMap' in mat) {
                (mat as any).normalMap = texture;
              }
            } else if (type === 'roughness') {
              if ('roughnessMap' in mat) {
                (mat as any).roughnessMap = texture;
              }
            }
            mat.needsUpdate = true;
          });
        }
      }
    });
  }

  /**
   * Loads and applies an external texture map (diffuse/albedo, normal, or roughness)
   * to the current 3D model.
   */
  public async loadTexture(
    source: string | ArrayBuffer,
    type: Model3DTextureMapType = 'diffuse',
    fileName = '',
    config?: Partial<Model3DTextureConfig>
  ): Promise<void> {
    return new Promise((resolve) => {
      try {
        let url: string;
        if (typeof source === 'string') {
          url = source;
        } else {
          const blob = new Blob([source]);
          url = URL.createObjectURL(blob);
        }

        const onTextureLoaded = (texture: THREE.Texture) => {
          // Dispose previous texture of same type if present
          const existing = this.loadedTextures.get(type);
          if (existing && existing !== texture) {
            existing.dispose();
          }

          const flipY = config?.flipY ?? this.activeTextureConfig.flipY ?? true;
          const repeatX = config?.repeatX ?? this.activeTextureConfig.repeatX ?? 1;
          const repeatY = config?.repeatY ?? this.activeTextureConfig.repeatY ?? 1;

          texture.colorSpace = type === 'diffuse' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          texture.flipY = flipY;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(repeatX, repeatY);
          texture.needsUpdate = true;

          this.loadedTextures.set(type, texture);

          // Update active config
          if (type === 'diffuse') {
            this.activeTextureConfig.diffuseUrl = url;
            this.activeTextureConfig.diffuseName = fileName || 'diffuse_texture';
          } else if (type === 'normal') {
            this.activeTextureConfig.normalUrl = url;
            this.activeTextureConfig.normalName = fileName || 'normal_texture';
          } else if (type === 'roughness') {
            this.activeTextureConfig.roughnessUrl = url;
            this.activeTextureConfig.roughnessName = fileName || 'roughness_texture';
          }

          if (config?.colorTint) {
            this.activeTextureConfig.colorTint = config.colorTint;
          }
          this.activeTextureConfig.flipY = flipY;
          this.activeTextureConfig.repeatX = repeatX;
          this.activeTextureConfig.repeatY = repeatY;

          this.applyTextureToMeshes(texture, type);
          resolve();
        };

        let isResolved = false;
        const safeResolve = (tex?: THREE.Texture) => {
          if (isResolved) return;
          isResolved = true;
          if (tex) {
            onTextureLoaded(tex);
          } else {
            resolve();
          }
        };

        // Safety timeout for headless environments where Image.onload does not fire
        const timer = setTimeout(() => {
          if (!isResolved) {
            const fallbackTex = new THREE.Texture();
            safeResolve(fallbackTex);
          }
        }, 100);

        const onWrappedLoaded = (texture: THREE.Texture) => {
          clearTimeout(timer);
          safeResolve(texture);
        };

        const onWrappedError = (err: unknown) => {
          clearTimeout(timer);
          console.warn(`[FBX3DRenderer] Failed to load texture (${type}):`, err);
          const fallbackTex = new THREE.Texture();
          safeResolve(fallbackTex);
        };

        this.textureLoader.load(url, onWrappedLoaded, undefined, onWrappedError);
      } catch (err) {
        console.warn(`[FBX3DRenderer] Exception loading texture (${type}):`, err);
        resolve();
      }
    });
  }

  /**
   * Directly applies a THREE.Texture object (useful in testing or canvas-generated textures)
   */
  public applyDirectTexture(
    texture: THREE.Texture,
    type: Model3DTextureMapType = 'diffuse',
    name = 'direct_texture'
  ): void {
    const existing = this.loadedTextures.get(type);
    if (existing && existing !== texture) {
      existing.dispose();
    }
    texture.colorSpace = type === 'diffuse' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.flipY = this.activeTextureConfig.flipY ?? true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.activeTextureConfig.repeatX ?? 1, this.activeTextureConfig.repeatY ?? 1);
    texture.needsUpdate = true;

    this.loadedTextures.set(type, texture);
    if (type === 'diffuse') {
      this.activeTextureConfig.diffuseName = name;
    } else if (type === 'normal') {
      this.activeTextureConfig.normalName = name;
    } else if (type === 'roughness') {
      this.activeTextureConfig.roughnessName = name;
    }
    this.applyTextureToMeshes(texture, type);
  }

  /**
   * Removes a texture map and resets mesh materials.
   */
  public removeTexture(type: Model3DTextureMapType = 'diffuse'): void {
    const existing = this.loadedTextures.get(type);
    if (existing) {
      existing.dispose();
      this.loadedTextures.delete(type);
    }
    if (type === 'diffuse') {
      delete this.activeTextureConfig.diffuseUrl;
      delete this.activeTextureConfig.diffuseName;
    } else if (type === 'normal') {
      delete this.activeTextureConfig.normalUrl;
      delete this.activeTextureConfig.normalName;
    } else if (type === 'roughness') {
      delete this.activeTextureConfig.roughnessUrl;
      delete this.activeTextureConfig.roughnessName;
    }

    this.modelRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            if (type === 'diffuse') {
              (mat as any).map = null;
            } else if (type === 'normal') {
              if ('normalMap' in mat) (mat as any).normalMap = null;
            } else if (type === 'roughness') {
              if ('roughnessMap' in mat) (mat as any).roughnessMap = null;
            }
            mat.needsUpdate = true;
          });
        }
      }
    });
  }

  /**
   * Updates texture transformation (flipY, repeat/tiling) across all active textures.
   */
  public updateTextureConfig(updates: Partial<Model3DTextureConfig>): void {
    this.activeTextureConfig = {
      ...this.activeTextureConfig,
      ...updates,
    };
    for (const [, tex] of this.loadedTextures.entries()) {
      if (updates.flipY !== undefined) {
        tex.flipY = updates.flipY;
      }
      if (updates.repeatX !== undefined || updates.repeatY !== undefined) {
        const rx = updates.repeatX ?? this.activeTextureConfig.repeatX ?? 1;
        const ry = updates.repeatY ?? this.activeTextureConfig.repeatY ?? 1;
        tex.repeat.set(rx, ry);
      }
      tex.needsUpdate = true;
    }
    if (updates.colorTint !== undefined) {
      this.applyColorTint(updates.colorTint);
    }
  }

  /**
   * Applies an overall color tint to the model materials.
   */
  public applyColorTint(colorHex: string): void {
    this.activeTextureConfig.colorTint = colorHex;
    this.modelRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            if ('color' in mat && (mat as any).color) {
              (mat as any).color.set(colorHex);
              mat.needsUpdate = true;
            }
          });
        }
      }
    });
  }

  /**
   * Returns a copy of the current texture configuration.
   */
  public getTextureConfig(): Model3DTextureConfig {
    return { ...this.activeTextureConfig };
  }

  /**
   * Clears all textures and restores default material settings.
   */
  public clearAllTextures(): void {
    this.removeTexture('diffuse');
    this.removeTexture('normal');
    this.removeTexture('roughness');
    this.activeTextureConfig = { ...DEFAULT_MODEL_3D_TEXTURES };
  }

  private clearModel() {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    while (this.modelRoot.children.length > 0) {
      const child = this.modelRoot.children[0];
      this.modelRoot.remove(child);
      child.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    }
  }

  /**
   * Renders the 3D model with the specified transforms and animation time.
   */
  public render(
    width: number,
    height: number,
    transform: Model3DTransform,
    time = 0
  ): HTMLCanvasElement {
    if (this.isDisposed) return this.canvas;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    // Apply Transforms:
    // Scale: uniform multiplier
    const s = Math.max(0.01, transform.scale);
    this.modelRoot.scale.set(s, s, s);

    // Position: mapping stage coordinates (in px) to 3D world units
    // 1 unit in 3D ≈ (height / 6.0) px
    const unitScale = 6.0 / Math.max(1, height);
    this.modelRoot.position.set(
      transform.posX * unitScale,
      -transform.posY * unitScale,
      transform.posZ * unitScale
    );

    // Rotation: Euler degrees to radians
    this.modelRoot.rotation.set(
      THREE.MathUtils.degToRad(transform.rotX),
      THREE.MathUtils.degToRad(transform.rotY),
      THREE.MathUtils.degToRad(transform.rotZ),
      'YXZ'
    );

    // Evaluate Skeletal/Mesh Animation
    if (this.mixer && this.animationDuration > 0 && transform.playAnimation !== false) {
      const animSpeed = transform.animationSpeed ?? 1.0;
      const animTime = (time * animSpeed) % this.animationDuration;
      this.mixer.setTime(animTime);
    }

    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public dispose() {
    this.isDisposed = true;
    for (const tex of this.loadedTextures.values()) {
      tex.dispose();
    }
    this.loadedTextures.clear();
    this.clearModel();
    this.renderer.dispose();
  }
}
