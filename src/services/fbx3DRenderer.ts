import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Model3DTransform } from '../types/model3D';

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
  private isDisposed = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(42, 1920 / 1080, 0.1, 1000);
    this.camera.position.set(0, 0, 7.5);

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

    // 1. Balanced Studio Lighting Rig (No blown-out glares)
    this.setupLighting();

    // 2. Root group for loaded model
    this.modelRoot = new THREE.Group();
    this.scene.add(this.modelRoot);

    this.loader = new FBXLoader();

    // Initialize with a sleek procedural 3D model until an external FBX is loaded
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
   * Loads an FBX model from a File blob, ArrayBuffer, or URL.
   */
  public async loadFBX(source: string | ArrayBuffer): Promise<void> {
    return new Promise((resolve) => {
      try {
        const onLoaded = (object: THREE.Group) => {
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

          // Setup materials if missing or unlit
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
          if (object.animations && object.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(object);
            const action = this.mixer.clipAction(object.animations[0]);
            action.play();
            this.animationDuration = object.animations[0].duration;
          } else {
            this.mixer = null;
            this.animationDuration = 0;
          }

          this.modelRoot.add(pivot);
          resolve();
        };

        if (typeof source === 'string') {
          this.currentModelUrl = source;
          this.loader.load(source, onLoaded, undefined, (err) => {
            console.warn('[FBX3DRenderer] Failed to load URL, falling back to default model:', err);
            this.buildDefaultProceduralModel();
            resolve();
          });
        } else {
          const parsed = this.loader.parse(source, '');
          onLoaded(parsed);
        }
      } catch (err) {
        console.warn('[FBX3DRenderer] Error parsing FBX:', err);
        this.buildDefaultProceduralModel();
        resolve();
      }
    });
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
    this.clearModel();
    this.renderer.dispose();
  }
}
