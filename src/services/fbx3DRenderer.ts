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

    this.camera = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.1, 1000);
    this.camera.position.set(0, 0, 7.5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(1920, 1080, false);
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 1. Studio Lighting Rig
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    // Key Light (warm high front-right)
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    keyLight.position.set(6, 8, 8);
    this.scene.add(keyLight);

    // Fill Light (cool soft left)
    const fillLight = new THREE.DirectionalLight(0xd4e4ff, 1.2);
    fillLight.position.set(-6, 2, 6);
    this.scene.add(fillLight);

    // Rim Light (sharp contour from behind)
    const rimLight = new THREE.DirectionalLight(0x88ccff, 2.0);
    rimLight.position.set(0, -6, -8);
    this.scene.add(rimLight);

    // Ground bounce
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.6);
    this.scene.add(hemiLight);
  }

  /**
   * Builds an ultra-clean procedural 3D smartphone/device model to serve as default
   * or fallback if no external FBX file is loaded.
   */
  private buildDefaultProceduralModel() {
    this.clearModel();

    const deviceGroup = new THREE.Group();

    // Chassis body
    const bodyGeo = new THREE.BoxGeometry(2.4, 4.8, 0.22);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.25,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    deviceGroup.add(body);

    // Glass Screen Front
    const screenGeo = new THREE.PlaneGeometry(2.25, 4.6);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      emissive: 0x312e81,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.9,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.z = 0.115;
    deviceGroup.add(screen);

    // Camera island on back
    const cameraBmpGeo = new THREE.BoxGeometry(0.8, 0.8, 0.08);
    const cameraBmpMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      metalness: 0.9,
      roughness: 0.15,
    });
    const cameraBump = new THREE.Mesh(cameraBmpGeo, cameraBmpMat);
    cameraBump.position.set(-0.6, 1.8, -0.14);
    deviceGroup.add(cameraBump);

    // Dual camera lenses
    const lensGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 32);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.95,
      roughness: 0.05,
    });
    const lens1 = new THREE.Mesh(lensGeo, lensMat);
    lens1.rotation.x = Math.PI / 2;
    lens1.position.set(-0.6, 2.0, -0.19);
    deviceGroup.add(lens1);

    const lens2 = new THREE.Mesh(lensGeo, lensMat);
    lens2.rotation.x = Math.PI / 2;
    lens2.position.set(-0.6, 1.6, -0.19);
    deviceGroup.add(lens2);

    this.modelRoot.add(deviceGroup);
  }

  /**
   * Loads an FBX model from a File blob, ArrayBuffer, or URL.
   */
  public async loadFBX(source: string | ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
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
