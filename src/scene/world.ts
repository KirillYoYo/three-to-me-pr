import GUI from 'lil-gui';
import Stats from 'stats-gl';
import {
  ACESFilmicToneMapping,
  Clock,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  IcosahedronGeometry,
  type Material,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TorusKnotGeometry,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import fragmentShader from '../shaders/fresnel.frag';
import vertexShader from '../shaders/fresnel.vert';

interface SceneParams {
  spin: boolean;
  spinSpeed: number;
  metalness: number;
  roughness: number;
  color: string;
  fresnelPower: number;
}

export class World {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly clock = new Clock();
  private readonly gui: GUI;
  private readonly stats: Stats;
  private readonly solid: Mesh;
  private readonly solidMaterial: MeshStandardMaterial;
  private readonly shader: Mesh;
  private readonly shaderMaterial: ShaderMaterial;
  private readonly grid: GridHelper;
  private readonly shaderUniforms: {
    uColor: { value: Color };
    uFresnelPower: { value: number };
  };

  private readonly params: SceneParams = {
    spin: true,
    spinSpeed: 0.45,
    metalness: 0.72,
    roughness: 0.22,
    color: '#8eb6ff',
    fresnelPower: 2.4,
  };

  private readonly root: HTMLElement;
  private disposed = false;

  private readonly onResize = () => {
    this.resize();
  };

  constructor(root: HTMLElement) {
    this.root = root;
    this.renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.root.append(this.renderer.domElement);

    this.scene.background = new Color('#0b0d12');

    this.camera = new PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(3.4, 1.7, 4.4);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.15, 0);

    const hemi = new HemisphereLight('#d5e2ff', '#2a1c14', 1.15);
    const sun = new DirectionalLight('#fff3e0', 2.6);
    sun.position.set(4.5, 6.5, 3);
    this.scene.add(hemi, sun);

    this.grid = new GridHelper(14, 28, '#31405c', '#1b2436');
    this.grid.position.y = -1.25;
    this.scene.add(this.grid);

    this.solidMaterial = new MeshStandardMaterial({
      color: this.params.color,
      metalness: this.params.metalness,
      roughness: this.params.roughness,
    });
    this.solid = new Mesh(new IcosahedronGeometry(0.82, 3), this.solidMaterial);
    this.solid.position.y = 0.15;
    this.scene.add(this.solid);

    this.shaderUniforms = {
      uColor: { value: new Color('#d7e6ff') },
      uFresnelPower: { value: this.params.fresnelPower },
    };
    this.shaderMaterial = new ShaderMaterial({
      uniforms: this.shaderUniforms,
      vertexShader,
      fragmentShader,
    });
    this.shader = new Mesh(new TorusKnotGeometry(1.45, 0.045, 220, 16), this.shaderMaterial);
    this.scene.add(this.shader);

    this.gui = new GUI({ title: 'scene' });
    this.gui.add(this.params, 'spin').name('spin');
    this.gui.add(this.params, 'spinSpeed', 0, 2, 0.01).name('spin speed');
    this.gui
      .add(this.params, 'metalness', 0, 1, 0.01)
      .name('metalness')
      .onChange((value: number) => {
        this.solidMaterial.metalness = value;
      });
    this.gui
      .add(this.params, 'roughness', 0, 1, 0.01)
      .name('roughness')
      .onChange((value: number) => {
        this.solidMaterial.roughness = value;
      });
    this.gui
      .addColor(this.params, 'color')
      .name('albedo')
      .onChange((value: string) => {
        this.solidMaterial.color.set(value);
      });
    this.gui
      .add(this.params, 'fresnelPower', 0.4, 6, 0.1)
      .name('fresnel')
      .onChange((value: number) => {
        this.shaderUniforms.uFresnelPower.value = value;
      });

    this.stats = new Stats({ trackGPU: true });
    document.body.append(this.stats.dom);

    this.resize();
    window.addEventListener('resize', this.onResize);
  }

  async start() {
    await this.stats.init(this.renderer);
    if (this.disposed) {
      return;
    }

    this.renderer.setAnimationLoop(() => {
      const delta = this.clock.getDelta();

      if (this.params.spin) {
        this.solid.rotation.y += delta * this.params.spinSpeed;
        this.shader.rotation.y -= delta * this.params.spinSpeed * 0.35;
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.stats.update();
    });
  }

  resize() {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.gui.destroy();
    this.stats.dispose();
    this.solid.geometry.dispose();
    this.solidMaterial.dispose();
    this.shader.geometry.dispose();
    this.shaderMaterial.dispose();
    this.grid.geometry.dispose();
    disposeMaterial(this.grid.material);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.root.replaceChildren();
  }
}

function disposeMaterial(material: Material | Material[]) {
  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    item.dispose();
  }
}
