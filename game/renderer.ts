import * as THREE from 'three';
import type { GameState } from './physics';

type CameraMode = 'tv' | 'cerca' | 'cenital';
type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  racket: THREE.Group;
  shadow: THREE.Mesh;
  ring: THREE.Mesh;
};

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

/** Tournament presentation. The physics engine remains the sole owner of play state. */
export class PadelRenderer {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 170);
  private renderer: THREE.WebGLRenderer;
  private court = new THREE.Group();
  private rigs: Rig[] = [];
  private ball: THREE.Mesh;
  private ballShadow: THREE.Mesh;
  private landing: THREE.Mesh;
  private trail: THREE.Line;
  private trailHistory: THREE.Vector3[] = [];
  private cameraMode: CameraMode = 'tv';
  private cameraTarget = new THREE.Vector3(0, 0.55, -0.25);
  private cameraPosition = new THREE.Vector3(0, 15, 21);
  private desiredCamera = new THREE.Vector3();
  private desiredTarget = new THREE.Vector3();
  private textures: THREE.Texture[] = [];
  private clock = 0;
  private seed = 51273;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private quality: 'alta' | 'media';
  private lookDirection = new THREE.Vector3();
  private venueSign: THREE.Mesh;
  private venueId = '';
  private venueDecorations = new Map<string, THREE.Group>();
  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private hemisphere!: THREE.HemisphereLight;
  private floorMaterial!: THREE.MeshStandardMaterial;
  private fieldMaterial!: THREE.MeshStandardMaterial;
  private seatMaterial!: THREE.MeshStandardMaterial;
  private backdropMaterial!: THREE.MeshStandardMaterial;

  constructor(
    private container: HTMLElement,
    options?: { quality?: 'alta' | 'media'; venue?: string },
  ) {
    this.quality = options?.quality ?? 'alta';
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        this.quality === 'alta' ? 1.8 : 1.2,
      ),
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x090f19, 1);
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Cancha de pádel 3D de Premier Padel',
    );
    this.renderer.domElement.style.cssText =
      'width:100%;height:100%;display:block;touch-action:none;';
    container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x091322);
    this.scene.fog = new THREE.FogExp2(0x0a1420, 0.013);
    this.scene.add(this.court);
    this.buildLights();
    this.buildCourt();
    this.buildStadium();
    this.venueSign = this.makeBanner(
      'MADRID P1 · PREMIER PADEL',
      12,
      0.68,
      '#131e2b',
      '#e8efee',
      56,
    );
    this.venueSign.position.set(0, 4.9, -15.4);
    this.scene.add(this.venueSign);
    for (let i = 0; i < 4; i++) this.rigs.push(this.makePlayer(i));
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.078, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0xdfff34, roughness: 0.98 }),
    );
    this.ball.castShadow = true;
    // Two curved seams remain visible in close view.
    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(0.076, 0.004, 4, 28),
      new THREE.MeshBasicMaterial({ color: 0xf4ffd4 }),
    );
    seam.rotation.y = Math.PI / 2;
    this.ball.add(seam);
    this.scene.add(this.ball);
    this.ballShadow = this.makeContactShadow(0.3, 0.62);
    this.scene.add(this.ballShadow);
    this.landing = new THREE.Mesh(
      new THREE.RingGeometry(0.23, 0.27, 48),
      new THREE.MeshBasicMaterial({
        color: 0xe5fa9b,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.landing.rotation.x = -Math.PI / 2;
    this.landing.position.y = 0.022;
    this.scene.add(this.landing);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(12 * 3), 3),
    );
    this.trail = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({
        color: 0xe2fc9c,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    this.trail.frustumCulled = false;
    this.scene.add(this.trail);
    this.buildVenueDecorations();
    this.setVenue(options?.venue ?? 'madrid');
    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.cameraTarget);
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  private random() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private material(
    color: THREE.ColorRepresentation,
    roughness = 0.85,
    metalness = 0,
  ) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  private box(
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = this.court,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material,
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  private cylinder(
    top: number,
    bottom: number,
    length: number,
    material: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
    segments = 12,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(top, bottom, length, segments),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private sphere(
    rx: number,
    ry: number,
    rz: number,
    material: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material);
    mesh.scale.set(rx, ry, rz);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private textureCanvas(
    size: number,
    draw: (ctx: CanvasRenderingContext2D, size: number) => void,
    repeat?: [number, number],
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    draw(ctx, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    if (repeat) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(...repeat);
    }
    this.textures.push(texture);
    return texture;
  }

  private buildLights() {
    this.hemisphere = new THREE.HemisphereLight(0xe6f0ff, 0x2c3947, 2.0);
    this.scene.add(this.hemisphere);
    const sun = (this.keyLight = new THREE.DirectionalLight(0xfffaf0, 3.1));
    sun.position.set(-8, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -17;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 55;
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0001;
    sun.shadow.radius = 3;
    this.scene.add(sun);
    const fill = (this.fillLight = new THREE.DirectionalLight(0xc4e0ff, 1.6));
    fill.position.set(8, 15, -13);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xdfffea, 0.7);
    rim.position.set(-12, 7, -4);
    this.scene.add(rim);
  }

  private buildCourt() {
    const turf = this.textureCanvas(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#176fb0';
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 88000; i++) {
          const n = this.random();
          ctx.fillStyle =
            n < 0.18
              ? 'rgba(142,211,226,.19)'
              : n < 0.53
                ? 'rgba(3,56,102,.23)'
                : 'rgba(87,162,198,.20)';
          const x = this.random() * s,
            y = this.random() * s;
          ctx.fillRect(
            x,
            y,
            0.5 + this.random() * 1.1,
            0.4 + this.random() * 2.6,
          );
        }
        for (let i = 0; i < 36; i++) {
          const x = this.random() * s,
            y = this.random() * s;
          const gradient = ctx.createRadialGradient(
            x,
            y,
            0,
            x,
            y,
            40 + this.random() * 60,
          );
          gradient.addColorStop(0, 'rgba(112,168,207,.06)');
          gradient.addColorStop(1, 'rgba(100,160,200,0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, s, s);
        }
      },
      [5, 10],
    );
    const groundTexture = this.textureCanvas(
      256,
      (ctx, s) => {
        ctx.fillStyle = '#192a38';
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 13000; i++) {
          ctx.fillStyle = `rgba(104,125,139,${this.random() * 0.1})`;
          ctx.fillRect(this.random() * s, this.random() * s, 1, 1);
        }
      },
      [16, 22],
    );
    this.floorMaterial = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 1,
    });
    const base = this.box(48, 0.25, 52, this.floorMaterial, 0, -0.19, 0);
    base.receiveShadow = true;
    this.fieldMaterial = new THREE.MeshStandardMaterial({
      map: turf,
      roughness: 0.97,
      bumpMap: turf,
      bumpScale: 0.012,
    });
    const field = this.box(10, 0.1, 20, this.fieldMaterial, 0, -0.04, 0);
    field.receiveShadow = true;
    // Alternating very subtle brushed carpet bands, as seen under competition floodlights.
    const stripeMaterial = new THREE.MeshBasicMaterial({
      color: 0x7ab3db,
      transparent: true,
      opacity: 0.025,
      depthWrite: false,
    });
    for (let z = -9; z < 10; z += 4)
      this.box(10, 0.004, 2, stripeMaterial, 0, 0.015, z);
    const line = this.material(0xeef5f4, 0.95);
    for (const z of [-6.95, 6.95]) {
      this.box(10, 0.012, 0.055, line, 0, 0.025, z);
      this.box(0.055, 0.012, 6.95, line, 0, 0.025, z / 2);
      this.box(0.055, 0.012, 0.22, line, 0, 0.025, z + Math.sign(z) * 0.11);
    }
    const black = this.material(0x14212c, 0.6, 0.62);
    const metal = this.material(0x34434c, 0.45, 0.7);
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xadcdd9,
      transparent: true,
      opacity: 0.095,
      roughness: 0.13,
      metalness: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const nearGlass = glass.clone();
    nearGlass.opacity = 0.025;
    // Broadcast cutaway: the front wall still collides in physics, but its frame never hides play.
    const frontBlack = black.clone();
    frontBlack.transparent = true;
    frontBlack.opacity = 0.075;
    frontBlack.depthWrite = false;
    const frontMetal = metal.clone();
    frontMetal.transparent = true;
    frontMetal.opacity = 0.075;
    frontMetal.depthWrite = false;
    // Back wall: glass to 3m, fencing to 4m.
    for (const z of [-10, 10]) {
      const frameMaterial = z > 0 ? frontBlack : black;
      const bracketMaterial = z > 0 ? frontMetal : metal;
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 3),
        z > 0 ? nearGlass : glass,
      );
      wall.position.set(0, 1.5, z);
      this.court.add(wall);
      this.addMeshFence(10, 1, 0, 3.5, z, 0, z > 0 ? 0.015 : 0.22);
      for (let x = -5; x <= 5; x += 2.5) {
        this.box(0.055, 4.02, 0.055, frameMaterial, x, 2, z);
        this.box(0.05, 0.1, 0.065, bracketMaterial, x, 0.3, z);
        this.box(0.05, 0.1, 0.065, bracketMaterial, x, 2.7, z);
      }
      this.box(10, 0.065, 0.065, frameMaterial, 0, 4, z);
      this.box(10, 0.035, 0.035, frameMaterial, 0, 3, z);
      this.box(10, 0.055, 0.055, black, 0, 0.04, z);
    }
    // Regulation sides: corner glazing, wire panels, and playable exit doors near the net.
    for (const x of [-5, 5]) {
      for (const z of [-8, 8]) {
        const side = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), glass);
        side.rotation.y = Math.PI / 2;
        side.position.set(x, 1.5, z);
        this.court.add(side);
        this.addMeshFence(4, 1, x, 3.5, z, Math.PI / 2, 0.2);
      }
      for (const z of [-3.4, 3.4])
        this.addMeshFence(5.2, 3, x, 1.5, z, Math.PI / 2, 0.23);
      for (const z of [-10, -8, -6, -4, -2, -0.8, 0.8, 2, 4, 6, 8, 10]) {
        const height = Math.abs(z) >= 6 ? 4 : 3;
        this.box(0.055, height, 0.055, black, x, height / 2, z);
      }
      for (const z of [-5.4, 5.4]) this.box(0.06, 0.06, 9.2, black, x, 3, z);
      for (const z of [-8, 8]) this.box(0.06, 0.06, 4, black, x, 4, z);
      const doorHeader = this.box(0.055, 0.055, 1.6, black, x, 2.7, 0);
      doorHeader.castShadow = true;
    }
    // Net mesh has individual woven squares, a subtly curved tape, and side tension posts.
    const netMap = this.textureCanvas(
      512,
      (ctx, s) => {
        ctx.clearRect(0, 0, s, s);
        ctx.strokeStyle = 'rgba(9,20,27,.85)';
        ctx.lineWidth = 2.2;
        for (let p = 0; p < s; p += 16) {
          ctx.beginPath();
          ctx.moveTo(p, 0);
          ctx.lineTo(p, s);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, p);
          ctx.lineTo(s, p);
          ctx.stroke();
        }
      },
      [5, 0.45],
    );
    const netGeometry = new THREE.PlaneGeometry(10, 0.84, 30, 1);
    const positions = netGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i);
      positions.setY(i, y - 0.035 * (1 - (x / 5) ** 2));
    }
    const net = new THREE.Mesh(
      netGeometry,
      new THREE.MeshStandardMaterial({
        map: netMap,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        roughness: 1,
        depthWrite: false,
      }),
    );
    net.position.set(0, 0.47, 0);
    this.court.add(net);
    const tapeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5, 0.925, 0),
      new THREE.Vector3(-2.5, 0.895, 0),
      new THREE.Vector3(0, 0.885, 0),
      new THREE.Vector3(2.5, 0.895, 0),
      new THREE.Vector3(5, 0.925, 0),
    ]);
    const tape = new THREE.Mesh(
      new THREE.TubeGeometry(tapeCurve, 36, 0.027, 6, false),
      this.material(0xedf2e8),
    );
    tape.scale.z = 0.62;
    tape.castShadow = true;
    this.court.add(tape);
    for (const x of [-5.02, 5.02]) {
      this.cylinder(0.045, 0.045, 1.05, black, this.court, x, 0.525, 0);
      this.box(0.28, 0.12, 0.3, black, x, 0.06, 0);
      const netLogo = this.makeBanner(
        'PREMIER',
        0.5,
        0.115,
        '#f4f4eb',
        '#20342d',
        60,
      );
      netLogo.position.set(x > 0 ? 4.5 : -4.5, 0.9, 0.019);
      this.court.add(netLogo);
    }
    // Lower LED ribbons sit behind the glass; their silhouettes never hide the ball.
    for (const z of [-10.25, 10.25]) {
      const board = this.makeBanner(
        'PREMIER PADEL      •      THE WORLD IS PADEL      •      PREMIER PADEL',
        10,
        0.52,
        '#07121e',
        '#d7f796',
        45,
      );
      board.position.set(0, 0.3, z);
      this.scene.add(board);
    }
    for (const x of [-5.3, 5.3]) {
      for (const z of [-7.4, 7.4]) {
        const panel = this.makeBanner(
          'PREMIER PADEL',
          4,
          0.45,
          '#0c1721',
          '#ebeee6',
          57,
        );
        panel.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
        panel.position.set(x, 0.28, z);
        this.scene.add(panel);
      }
    }
    // Court-side competition furniture and personnel.
    for (const x of [-7.2, 7.2]) {
      const benchMaterial = this.material(0x344a59, 0.5);
      this.box(0.6, 0.12, 2.4, benchMaterial, x, 0.45, 3.3, this.scene);
      this.box(
        0.12,
        0.7,
        2.4,
        benchMaterial,
        x + Math.sign(x) * 0.24,
        0.8,
        3.3,
        this.scene,
      );
      for (const z of [2.45, 4.15])
        this.box(0.4, 0.43, 0.08, black, x, 0.21, z, this.scene);
      const bag = this.sphere(
        0.25,
        0.16,
        0.5,
        this.material(x > 0 ? 0xcedf80 : 0x263e5a),
        this.scene,
        x - Math.sign(x) * 0.1,
        0.2,
        5.0,
      );
      bag.rotation.z = 0.15;
      for (const z of [2.7, 3.05]) {
        this.cylinder(
          0.047,
          0.047,
          0.2,
          this.material(0xe4ebed, 0.3),
          this.scene,
          x,
          0.61,
          z,
        );
        this.cylinder(
          0.045,
          0.045,
          0.025,
          this.material(0x58b7e8),
          this.scene,
          x,
          0.72,
          z,
        );
      }
    }
    // Raised umpire chair, built at human scale.
    this.box(
      0.65,
      0.12,
      0.8,
      this.material(0x596a74),
      -6.15,
      1.75,
      0,
      this.scene,
    );
    for (const z of [-0.34, 0.34])
      this.box(0.05, 1.75, 0.05, metal, -6.35, 0.875, z, this.scene);
    for (let y = 0.2; y < 1.7; y += 0.3)
      this.box(0.45, 0.04, 0.04, metal, -5.96, y, 0.4, this.scene);
    this.box(0.05, 0.7, 0.8, black, -6.48, 2.06, 0, this.scene);
    this.makeStaff(-6.16, 1.78, 0, Math.PI / 2, true);
    this.makeStaff(6.7, 0, -9.8, -Math.PI / 2, false);
    this.makeStaff(-6.7, 0, -9.8, Math.PI / 2, false);
  }

  private addMeshFence(
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    rotation: number,
    opacity: number,
  ) {
    const positions: number[] = [];
    const spacing = 0.15;
    for (let xx = -width / 2; xx <= width / 2; xx += spacing)
      positions.push(xx, -height / 2, 0, xx, height / 2, 0);
    for (let yy = -height / 2; yy <= height / 2; yy += spacing)
      positions.push(-width / 2, yy, 0, width / 2, yy, 0);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const mesh = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color: 0x7b929f,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    this.court.add(mesh);
  }

  private makeBanner(
    text: string,
    width: number,
    height: number,
    bg: string,
    color: string,
    fontSize = 64,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = Math.round((2048 * height) / width);
    canvas.height = Math.max(128, canvas.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.min(canvas.height * 0.5, fontSize * 2)}px "Arial Narrow", Arial, sans-serif`;
    ctx.fillText(
      text,
      canvas.width / 2,
      canvas.height * 0.54,
      canvas.width * 0.95,
    );
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    this.textures.push(texture);
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
    );
  }

  private buildStadium() {
    const concrete = this.material(0x152230, 0.94);
    const rails = this.material(0x405365, 0.5, 0.6);
    const dark = this.material(0x070e16, 0.8);
    // A compact arena bowl, with shallow rows and a central back entrance.
    const rows: {
      x: number;
      y: number;
      z: number;
      rot: number;
      count: number;
      step: number;
    }[] = [];
    for (let row = 0; row < 7; row++) {
      const y = 0.25 + row * 0.52;
      const z = -12.2 - row * 0.9;
      this.box(25, 0.55 + row * 0.52, 0.89, concrete, 0, y / 2, z, this.scene);
      rows.push({ x: -11.7, y: y + 0.15, z, rot: 0, count: 38, step: 0.63 });
      for (const side of [-1, 1]) {
        const x = side * (8.9 + row * 0.85);
        this.box(
          0.86,
          0.55 + row * 0.52,
          24,
          concrete,
          x,
          y / 2,
          -1.1,
          this.scene,
        );
        rows.push({
          x,
          y: y + 0.15,
          z: -12.4,
          rot: (side * -Math.PI) / 2,
          count: 35,
          step: 0.65,
        });
      }
    }
    const seatGeo = new THREE.BoxGeometry(0.46, 0.1, 0.43);
    const seatBackGeo = new THREE.BoxGeometry(0.46, 0.43, 0.095);
    const seatMaterial = (this.seatMaterial = this.material(0x254458, 0.8));
    const seats = new THREE.InstancedMesh(seatGeo, seatMaterial, 900);
    const backs = new THREE.InstancedMesh(seatBackGeo, seatMaterial, 900);
    const crowdBody = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.15, 0.18, 0.49, 7),
      this.material(0xffffff),
      750,
    );
    const crowdHead = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.11, 7, 6),
      this.material(0xffffff),
      750,
    );
    const crowdLegs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.25, 0.29, 0.32),
      this.material(0xffffff),
      750,
    );
    const dummy = new THREE.Object3D();
    const palette = [
      0x293846, 0x99aabb, 0xc7ccca, 0x284f71, 0x795c57, 0x576b5b, 0x192931,
      0x8c989f, 0x43456b, 0xb8b0a3,
    ];
    const skinTones = [0xb88564, 0xdbad86, 0x8a5f49, 0xd9b090, 0xab8065];
    let seatIndex = 0,
      spectator = 0;
    for (const row of rows) {
      for (let i = 0; i < row.count; i++) {
        const back = row.rot === 0;
        const x = row.x + (back ? i * row.step : 0);
        const z = row.z + (back ? 0 : i * row.step);
        // Aisles break the otherwise repetitive spectator masses.
        if ((back && Math.abs(x) < 0.65) || (!back && Math.abs(z) < 1.2))
          continue;
        dummy.position.set(x, row.y + 0.28, z);
        dummy.rotation.set(0, row.rot, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        seats.setMatrixAt(seatIndex, dummy.matrix);
        dummy.translateZ(-0.21);
        dummy.position.y += 0.22;
        dummy.updateMatrix();
        backs.setMatrixAt(seatIndex, dummy.matrix);
        seatIndex++;
        if (this.random() < 0.13 || spectator >= 750) continue;
        const variance = 0.86 + this.random() * 0.27;
        dummy.position.set(x + (this.random() - 0.5) * 0.05, row.y + 0.66, z);
        dummy.rotation.set(
          (this.random() - 0.5) * 0.14,
          row.rot + (this.random() - 0.5) * 0.3,
          0,
        );
        dummy.scale.set(variance, variance, 0.73);
        dummy.updateMatrix();
        crowdBody.setMatrixAt(spectator, dummy.matrix);
        crowdBody.setColorAt(
          spectator,
          new THREE.Color(palette[Math.floor(this.random() * palette.length)]),
        );
        dummy.position.y += 0.36 * variance;
        dummy.scale.set(1, 1.12, 0.92);
        dummy.updateMatrix();
        crowdHead.setMatrixAt(spectator, dummy.matrix);
        crowdHead.setColorAt(
          spectator,
          new THREE.Color(
            skinTones[Math.floor(this.random() * skinTones.length)],
          ),
        );
        dummy.position.y = row.y + 0.26;
        dummy.translateZ(0.1);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        crowdLegs.setMatrixAt(spectator, dummy.matrix);
        crowdLegs.setColorAt(
          spectator,
          new THREE.Color(this.random() > 0.5 ? 0x192b3c : 0x3c4953),
        );
        spectator++;
      }
    }
    seats.count = backs.count = seatIndex;
    crowdBody.count = crowdHead.count = crowdLegs.count = spectator;
    this.scene.add(seats, backs, crowdBody, crowdHead, crowdLegs);
    for (const x of [-8.05, 8.05]) {
      this.box(0.05, 0.05, 23, rails, x, 1.02, -1.5, this.scene);
      for (let z = -12; z < 11; z += 2)
        this.box(0.05, 1, 0.05, rails, x, 0.5, z, this.scene);
      const panel = this.makeBanner(
        'PREMIER PADEL     •     EL MEJOR PÁDEL DEL MUNDO',
        22,
        0.55,
        '#0a1521',
        '#b8c8c9',
        43,
      );
      panel.position.set(x, 0.45, -1.4);
      panel.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(panel);
    }
    this.backdropMaterial = this.material(0x070e16, 0.8);
    this.box(34, 8, 0.4, this.backdropMaterial, 0, 3.9, -19, this.scene);
    const farBrand = this.makeBanner(
      'PREMIER PADEL',
      13,
      1.6,
      '#080f19',
      '#e4eee8',
      88,
    );
    farBrand.position.set(0, 7.0, -18.75);
    this.scene.add(farBrand);
    // Soft lit gates frame the tournament banner without adding UI-like neon everywhere.
    const accent = new THREE.MeshStandardMaterial({
      color: 0xbfe584,
      emissive: 0xa4cf65,
      emissiveIntensity: 0.75,
      roughness: 0.4,
    });
    this.box(3.2, 0.06, 0.08, accent, -9.6, 6.9, -18.5, this.scene);
    this.box(3.2, 0.06, 0.08, accent, 9.6, 6.9, -18.5, this.scene);
    // Structural light towers and banks of LED luminaires.
    const bulb = new THREE.MeshBasicMaterial({ color: 0xf4f6e7 });
    for (const x of [-7.1, 7.1]) {
      for (const z of [-9, 9]) {
        this.cylinder(0.07, 0.11, 9, rails, this.scene, x, 4.5, z);
        this.box(1.65, 0.13, 0.3, dark, x, 8.9, z, this.scene);
        for (let i = 0; i < 5; i++) {
          const lamp = this.box(
            0.24,
            0.15,
            0.28,
            rails,
            x - 0.62 + i * 0.31,
            8.85,
            z,
            this.scene,
          );
          lamp.rotation.x = x > 0 ? -0.1 : 0.1;
          this.box(
            0.2,
            0.025,
            0.23,
            bulb,
            x - 0.62 + i * 0.31,
            8.75,
            z,
            this.scene,
          );
        }
      }
    }
    // Tournament floor typography appears physically printed outside the playing enclosure.
    const floorMark = this.makeBanner(
      'PREMIER PADEL',
      6.0,
      0.8,
      '#192a38',
      '#a6b8bf',
      70,
    );
    floorMark.rotation.x = -Math.PI / 2;
    floorMark.position.set(0, -0.048, 12.25);
    this.scene.add(floorMark);
    // Broadcast camera at the side of the arena.
    for (const z of [-6.5, 7]) {
      const camera = new THREE.Group();
      camera.position.set(7.15, 0, z);
      for (let i = 0; i < 3; i++) {
        const leg = this.cylinder(
          0.018,
          0.024,
          1.45,
          rails,
          camera,
          Math.cos((i * TAU) / 3) * 0.18,
          0.63,
          Math.sin((i * TAU) / 3) * 0.18,
        );
        leg.rotation.z = Math.cos((i * TAU) / 3) * 0.23;
        leg.rotation.x = Math.sin((i * TAU) / 3) * 0.23;
      }
      this.box(0.43, 0.26, 0.3, dark, 0, 1.47, 0, camera);
      const lens = this.cylinder(
        0.095,
        0.095,
        0.2,
        dark,
        camera,
        -0.3,
        1.47,
        0,
      );
      lens.rotation.z = Math.PI / 2;
      this.scene.add(camera);
    }
  }

  private makeContactShadow(radius: number, opacity: number) {
    const texture = this.textureCanvas(128, (ctx, size) => {
      const gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2,
      );
      gradient.addColorStop(0, 'rgba(0,8,15,.75)');
      gradient.addColorStop(0.35, 'rgba(0,8,15,.4)');
      gradient.addColorStop(1, 'rgba(0,8,15,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    });
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.034;
    return shadow;
  }

  private makePlayer(index: number): Rig {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const team = index < 2 ? 0 : 1;
    const skin = this.material(index % 2 === 0 ? 0xc59677 : 0xd9ae8e, 0.8);
    const darkSkin = this.material(index % 2 === 0 ? 0x946c50 : 0xb27e5f, 0.88);
    const shirtColor =
      team === 0
        ? index === 0
          ? 0xdbe99c
          : 0xc7d781
        : index === 2
          ? 0xeae8dc
          : 0xcfdadb;
    const clothTexture = this.textureCanvas(
      128,
      (ctx, size) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        for (let y = 0; y < size; y += 3) {
          ctx.strokeStyle = 'rgba(24,41,32,.055)';
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size, y);
          ctx.stroke();
        }
        for (let i = 0; i < 450; i++) {
          ctx.fillStyle = 'rgba(21,31,28,.08)';
          ctx.fillRect(this.random() * size, this.random() * size, 1, 2);
        }
      },
      [2, 2],
    );
    const shirt = new THREE.MeshStandardMaterial({
      color: shirtColor,
      map: clothTexture,
      roughness: 0.95,
    });
    const shorts = this.material(team === 0 ? 0x1b303e : 0x2e526f, 0.94);
    const socks = this.material(0xe5e8e0, 0.96);
    const shoes = this.material(team === 0 ? 0xecf3d9 : 0xdfecf1, 0.72);
    const trim = this.material(team === 0 ? 0x29372e : 0x48656e);
    const hair = this.material(index === 1 ? 0x3e2b20 : 0x211e1b, 0.93);
    // Torso is a tapered, elliptic athletic silhouette with shoulder and clavicle volume.
    const torso = this.cylinder(
      0.238,
      0.197,
      0.55,
      shirt,
      body,
      0,
      0.42,
      0,
      20,
    );
    torso.scale.z = 0.65;
    this.sphere(0.245, 0.11, 0.16, shirt, body, 0, 0.64, 0);
    const pelvis = this.cylinder(
      0.207,
      0.198,
      0.23,
      shorts,
      body,
      0,
      0.065,
      0,
      18,
    );
    pelvis.scale.z = 0.8;
    this.box(0.034, 0.48, 0.02, trim, -0.178, 0.42, -0.13, body);
    this.box(0.034, 0.48, 0.02, trim, 0.178, 0.42, -0.13, body);
    const sponsor = this.makeBanner(
      'PREMIER',
      0.24,
      0.055,
      team === 0 ? '#d4e594' : '#e1e7df',
      '#1a2d34',
      30,
    );
    sponsor.position.set(0, 0.49, -0.159);
    sponsor.rotation.y = Math.PI;
    body.add(sponsor);
    const backNumber = this.makeBanner(
      `${index + 1}`,
      0.15,
      0.16,
      team === 0 ? '#d4e594' : '#e1e7df',
      '#1a2d34',
      55,
    );
    backNumber.position.set(0, 0.42, 0.145);
    body.add(backNumber);
    this.cylinder(0.07, 0.082, 0.12, skin, body, 0, 0.77, 0);
    // Collar and shoulder fabric remain separate from neck and bare arm volumes.
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.018, 6, 20),
      trim,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.704, -0.018);
    body.add(collar);
    const head = new THREE.Group();
    head.position.set(0, 0.885, -0.012);
    body.add(head);
    this.sphere(0.115, 0.149, 0.113, skin, head, 0, 0.016, 0);
    this.sphere(0.1, 0.075, 0.099, skin, head, 0, -0.063, -0.019);
    this.sphere(0.031, 0.035, 0.048, skin, head, 0, -0.008, -0.115);
    this.sphere(0.017, 0.033, 0.023, darkSkin, head, -0.117, 0.002, 0.002);
    this.sphere(0.017, 0.033, 0.023, darkSkin, head, 0.117, 0.002, 0.002);
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(1, 18, 12, 0, TAU, 0, Math.PI * 0.52),
      hair,
    );
    hairCap.scale.set(0.122, 0.15, 0.119);
    hairCap.position.set(0, 0.028, 0.005);
    head.add(hairCap);
    this.box(0.039, 0.01, 0.007, hair, -0.044, 0.042, -0.102, head);
    this.box(0.039, 0.01, 0.007, hair, 0.044, 0.042, -0.102, head);
    const eyeMat = this.material(0x252522);
    this.sphere(0.008, 0.009, 0.004, eyeMat, head, -0.043, 0.025, -0.111);
    this.sphere(0.008, 0.009, 0.004, eyeMat, head, 0.043, 0.025, -0.111);
    if (index % 2 === 0) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.121, 0.122, 0.03, 20, 1, true),
        this.material(team === 0 ? 0x22382a : 0x315879),
      );
      band.position.y = 0.07;
      head.add(band);
    } else {
      const beard = this.sphere(
        0.096,
        0.062,
        0.078,
        hair,
        head,
        0,
        -0.069,
        -0.04,
      );
      beard.scale.z *= 0.93;
      this.sphere(0.078, 0.047, 0.071, skin, head, 0, -0.041, -0.067);
    }
    const arm = (side: -1 | 1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.248, 0.635, 0);
      body.add(shoulder);
      this.sphere(0.09, 0.104, 0.096, shirt, shoulder, side * 0.006, -0.025, 0);
      this.cylinder(0.09, 0.076, 0.14, shirt, shoulder, 0, -0.071, 0);
      this.cylinder(0.07, 0.054, 0.22, skin, shoulder, 0, -0.212, 0);
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.32, 0);
      shoulder.add(elbow);
      this.sphere(0.055, 0.058, 0.055, skin, elbow);
      this.cylinder(0.054, 0.038, 0.255, skin, elbow, 0, -0.132, 0);
      this.cylinder(0.045, 0.044, 0.06, socks, elbow, 0, -0.224, 0);
      this.sphere(0.044, 0.068, 0.036, skin, elbow, 0, -0.289, -0.006);
      return [shoulder, elbow] as const;
    };
    const leg = (side: -1 | 1) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.115, 0.01, 0);
      body.add(hip);
      const short = this.cylinder(0.122, 0.116, 0.255, shorts, hip, 0, -0.1, 0);
      short.scale.z = 0.9;
      this.cylinder(0.098, 0.069, 0.26, skin, hip, 0, -0.3, 0);
      const knee = new THREE.Group();
      knee.position.set(0, -0.43, 0);
      hip.add(knee);
      this.sphere(0.073, 0.074, 0.072, skin, knee, 0, 0, -0.007);
      this.cylinder(0.069, 0.047, 0.28, skin, knee, 0, -0.137, 0.007);
      this.cylinder(0.054, 0.049, 0.17, socks, knee, 0, -0.296, 0.007);
      this.sphere(0.076, 0.07, 0.146, shoes, knee, 0, -0.405, -0.044);
      this.box(0.146, 0.027, 0.245, trim, 0, -0.442, -0.043, knee);
      this.box(0.085, 0.012, 0.067, socks, 0, -0.367, -0.08, knee);
      return [hip, knee] as const;
    };
    const [leftArm, leftElbow] = arm(-1),
      [rightArm, rightElbow] = arm(1);
    const [leftLeg, leftKnee] = leg(-1),
      [rightLeg, rightKnee] = leg(1);
    const racket = this.makeRacket(team);
    racket.position.set(0, -0.305, 0);
    racket.rotation.z = -0.12;
    rightElbow.add(racket);
    const shadow = this.makeContactShadow(0.66, 0.64);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.38, 0.42, 56),
      new THREE.MeshBasicMaterial({
        color: 0xd7fa88,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.036;
    this.scene.add(root, shadow, ring);
    body.position.y = 0.9;
    return {
      root,
      body,
      head,
      leftArm,
      rightArm,
      leftElbow,
      rightElbow,
      leftLeg,
      rightLeg,
      leftKnee,
      rightKnee,
      racket,
      shadow,
      ring,
    };
  }

  private makeRacket(team: number) {
    const group = new THREE.Group();
    const graphite = this.material(0x152330, 0.35, 0.2);
    const faceMaterial = this.material(
      team === 0 ? 0xbed777 : 0x5f99c1,
      0.55,
      0.13,
    );
    // Real padel pala: solid face with drilled holes, throat and short wrapped grip.
    const outline = new THREE.Shape();
    outline.moveTo(0, 0.13);
    outline.bezierCurveTo(-0.08, 0.14, -0.19, 0.25, -0.185, 0.37);
    outline.bezierCurveTo(-0.18, 0.6, 0.18, 0.6, 0.185, 0.37);
    outline.bezierCurveTo(0.19, 0.25, 0.08, 0.14, 0, 0.13);
    for (let row = 0; row < 5; row++) {
      for (let col = -2; col <= 2; col++) {
        const hx = col * 0.055,
          hy = 0.26 + row * 0.053;
        if ((row === 0 || row === 4) && Math.abs(col) === 2) continue;
        const hole = new THREE.Path();
        hole.absarc(hx, hy, 0.014, 0, TAU, false);
        outline.holes.push(hole);
      }
    }
    const frame = new THREE.Mesh(
      new THREE.ExtrudeGeometry(outline, {
        depth: 0.028,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.011,
        bevelThickness: 0.007,
        curveSegments: 10,
      }),
      [faceMaterial, graphite],
    );
    frame.castShadow = true;
    group.add(frame);
    const grip = this.cylinder(
      0.025,
      0.025,
      0.17,
      graphite,
      group,
      0,
      0.075,
      0.011,
    );
    for (let y = 0.016; y < 0.15; y += 0.021)
      this.cylinder(
        0.027,
        0.027,
        0.004,
        this.material(0x8d9d93),
        group,
        0,
        y,
        0.011,
        8,
      );
    grip.rotation.z = 0;
    const cord = new THREE.Mesh(
      new THREE.TorusGeometry(0.047, 0.004, 4, 14, Math.PI * 1.65),
      graphite,
    );
    cord.scale.x = 0.6;
    cord.position.set(0.025, -0.025, 0.011);
    group.add(cord);
    group.rotation.x = Math.PI;
    return group;
  }

  private makeStaff(
    x: number,
    y: number,
    z: number,
    facing: number,
    seated: boolean,
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = facing;
    const clothing = this.material(0x18334a),
      skin = this.material(0xb78f76),
      trouser = this.material(0x25343d);
    this.cylinder(0.2, 0.17, 0.49, clothing, group, 0, seated ? 0.43 : 1.1, 0);
    this.sphere(0.115, 0.15, 0.113, skin, group, 0, seated ? 0.85 : 1.51, 0);
    for (const side of [-1, 1]) {
      const arm = this.cylinder(
        0.058,
        0.044,
        0.55,
        skin,
        group,
        side * 0.22,
        seated ? 0.43 : 1.08,
        -0.05,
      );
      arm.rotation.z = side * 0.11;
      const leg = this.cylinder(
        0.081,
        0.052,
        seated ? 0.48 : 0.8,
        trouser,
        group,
        side * 0.105,
        seated ? -0.04 : 0.45,
        seated ? -0.24 : 0,
      );
      leg.rotation.x = seated ? -0.15 : 0;
      if (seated) {
        const thigh = this.cylinder(
          0.096,
          0.08,
          0.4,
          trouser,
          group,
          side * 0.105,
          0.2,
          -0.14,
        );
        thigh.rotation.x = Math.PI / 2;
      }
    }
    this.scene.add(group);
  }

  private buildVenueDecorations() {
    // Distinct, intentionally interpreted arena architecture; no claim of licensed stadium scans.
    const madrid = new THREE.Group(),
      paris = new THREE.Group(),
      rome = new THREE.Group();
    this.venueDecorations.set('madrid', madrid);
    this.venueDecorations.set('paris', paris);
    this.venueDecorations.set('rome', rome);
    this.scene.add(madrid, paris, rome);
    const truss = this.material(0x293640, 0.55, 0.6);
    for (let z = -20; z <= -12; z += 4) {
      this.box(38, 0.13, 0.13, truss, 0, 11.0, z, madrid);
      this.box(38, 0.1, 0.1, truss, 0, 10.4, z, madrid);
      for (let x = -18; x < 19; x += 2) {
        const brace = this.box(0.07, 2.05, 0.07, truss, x, 10.7, z, madrid);
        brace.rotation.z = Math.PI / 2 - 0.29;
      }
    }
    const stone = this.material(0xb29673, 0.95);
    const warmStone = this.material(0xbeb0a0, 0.94);
    const roof = this.material(0x594c3f, 0.65);
    const greenery = this.material(0x294239, 1);
    // Paris: bright ochre architectural wings and trees above the stadium bowl.
    for (const side of [-1, 1]) {
      this.box(8.2, 5.2, 0.5, stone, side * 11.7, 7.1, -19.0, paris);
      this.box(8.6, 0.35, 1.3, roof, side * 11.7, 9.8, -18.6, paris);
      for (let i = 0; i < 5; i++) {
        const x = side * (8.2 + i * 1.6);
        this.box(0.15, 4.6, 0.3, warmStone, x, 7.2, -18.6, paris);
        this.box(
          0.8,
          2.4,
          0.12,
          this.material(0x4c6267, 0.25, 0.2),
          x + side * 0.55,
          7.9,
          -18.68,
          paris,
        );
      }
      for (const z of [-23, -17, -10]) {
        this.cylinder(0.13, 0.22, 5.8, roof, paris, side * 18.5, 2.9, z);
        this.sphere(2.2, 3.0, 2.0, greenery, paris, side * 18.5, 7.7, z);
        this.sphere(1.8, 2.1, 1.8, greenery, paris, side * 17.1, 6.2, z - 1.1);
      }
    }
    // Rome: pale stone colonnades and slender cypress silhouettes under warm floodlights.
    const romanStone = this.material(0xc7b797, 0.96);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const x = side * (8.3 + i * 1.85);
        this.cylinder(0.22, 0.25, 4.8, romanStone, rome, x, 6.9, -18.4);
        this.box(0.69, 0.21, 0.65, romanStone, x, 9.35, -18.4, rome);
        this.box(0.72, 0.3, 0.69, romanStone, x, 4.55, -18.4, rome);
        if (i < 4) {
          const arch = new THREE.Mesh(
            new THREE.TorusGeometry(0.93, 0.16, 8, 24, Math.PI),
            romanStone,
          );
          arch.position.set(x + side * 0.925, 8.26, -18.4);
          rome.add(arch);
        }
      }
      this.box(9.0, 0.28, 0.75, romanStone, side * 11.95, 9.6, -18.4, rome);
      for (const z of [-23, -16, -8]) {
        this.cylinder(0.1, 0.17, 4.2, roof, rome, side * 18, 2.1, z);
        this.sphere(0.8, 4.0, 0.9, greenery, rome, side * 18, 7, z);
      }
    }
  }

  setVenue(id: string) {
    const key = this.venueDecorations.has(id) ? id : 'madrid';
    if (key === this.venueId) return;
    this.venueId = key;
    this.venueDecorations.forEach((group, venue) => {
      group.visible = venue === key;
    });
    const day = key === 'paris',
      warm = key === 'rome';
    const background = new THREE.Color(
      day ? 0xadc0ca : warm ? 0x151c2d : 0x091322,
    );
    this.scene.background = background;
    (this.scene.fog as THREE.FogExp2).color.copy(background);
    (this.scene.fog as THREE.FogExp2).density = day ? 0.007 : 0.013;
    this.keyLight.color.set(day ? 0xfff0d3 : warm ? 0xffd4a3 : 0xfffaf0);
    this.keyLight.intensity = day ? 3.4 : warm ? 3.2 : 3.1;
    this.keyLight.position.set(day ? -12 : -8, day ? 25 : 20, day ? -3 : 10);
    this.fillLight.color.set(day ? 0xdbeeff : warm ? 0xc0d6ff : 0xc4e0ff);
    this.hemisphere.intensity = day ? 2.6 : 2;
    this.hemisphere.groundColor.set(
      day ? 0x6b6857 : warm ? 0x514b40 : 0x2c3947,
    );
    this.floorMaterial.color.set(day ? 0xd8a98b : warm ? 0xbdada0 : 0xffffff);
    this.fieldMaterial.color.set(day ? 0xd1e2e6 : warm ? 0xd8e2e9 : 0xffffff);
    this.seatMaterial.color.set(day ? 0x839985 : warm ? 0x59717d : 0x254458);
    this.backdropMaterial.color.set(
      day ? 0x6d7369 : warm ? 0x424342 : 0x070e16,
    );
    const previousMaterial = this.venueSign.material as THREE.MeshBasicMaterial;
    const title = day
      ? 'PARIS MAJOR · ROLAND-GARROS'
      : warm
        ? 'ITALY MAJOR · FORO ITALICO'
        : 'MADRID P1 · MOVISTAR ARENA';
    const sign = this.makeBanner(
      title,
      12,
      0.68,
      day ? '#e2dece' : warm ? '#2c2d2c' : '#131e2b',
      day ? '#233d36' : '#e8efee',
      56,
    );
    this.venueSign.material = sign.material;
    sign.geometry.dispose();
    previousMaterial.dispose();
  }

  setCamera(mode: CameraMode) {
    this.cameraMode = mode;
  }

  resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth),
      height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(state: GameState, dt: number) {
    if (this.disposed) return;
    this.clock += Math.min(dt, 0.05);
    const time = Number.isFinite(state.time) ? state.time : this.clock;
    for (let i = 0; i < this.rigs.length; i++) {
      const player = state.players[i];
      if (!player) continue;
      const rig = this.rigs[i];
      const speed = Math.hypot(player.vx || 0, player.vz || 0);
      const stride = Math.min(speed / 4.0, 1);
      const cycle = time * (9.5 + speed * 0.8) + i * 1.7;
      const step = Math.sin(cycle) * stride;
      const bounce = Math.abs(Math.cos(cycle)) * 0.035 * stride;
      const swing = clamp(player.swing || 0, 0, 1);
      const phase = (1 - swing) * Math.PI;
      const overhead =
        player.shot === 'remate' ||
        player.shot === 'bandeja' ||
        player.shot === 'vibora';
      rig.root.position.set(player.x, 0, player.z);
      const defaultFacing = player.z > 0 ? 0 : Math.PI;
      let facing = Number.isFinite(player.facing)
        ? player.facing
        : defaultFacing;
      if (!Number.isFinite(facing)) facing = defaultFacing;
      let delta = ((facing - rig.root.rotation.y + Math.PI) % TAU) - Math.PI;
      if (delta < -Math.PI) delta += TAU;
      rig.root.rotation.y += delta * Math.min(1, dt * 12);
      rig.body.position.y =
        0.9 +
        bounce +
        (swing > 0.1 && player.shot === 'remate' ? Math.sin(phase) * 0.2 : 0);
      rig.body.rotation.set(
        -stride * 0.05 - 0.015,
        Math.sin(phase) * swing * (overhead ? -0.28 : -0.6),
        -step * 0.035,
      );
      rig.leftLeg.rotation.set(step * 0.6 + 0.07, 0, -0.025 - stride * 0.045);
      rig.rightLeg.rotation.set(-step * 0.6 + 0.07, 0, 0.025 + stride * 0.045);
      rig.leftKnee.rotation.x = -Math.max(0, -step) * 0.83 - 0.1;
      rig.rightKnee.rotation.x = -Math.max(0, step) * 0.83 - 0.1;
      // Ready stance, relaxed elbows, and counter-swing while recovering position.
      rig.leftArm.rotation.set(0.18 - step * 0.36, 0, -0.15);
      rig.rightArm.rotation.set(0.32 + step * 0.31, -0.12, 0.17);
      rig.leftElbow.rotation.set(0.45, 0, 0);
      rig.rightElbow.rotation.set(0.68, 0, 0);
      rig.racket.rotation.set(Math.PI + 0.18, -0.1, -0.12);
      if (swing > 0.01) {
        const force = Math.sin(phase);
        if (overhead) {
          rig.rightArm.rotation.x = 2.65 - (1 - swing) * 2.2;
          rig.rightArm.rotation.z =
            0.36 + (player.shot === 'vibora' ? 0.52 : 0.08);
          rig.rightElbow.rotation.x = 0.65 - force * 0.65;
          rig.leftArm.rotation.x = 1.15 * swing;
          rig.leftArm.rotation.z = -0.45;
          rig.racket.rotation.x = Math.PI - 0.35;
          rig.head.rotation.x = 0.18 * swing;
        } else if (player.shot === 'globo') {
          rig.rightArm.rotation.x = 0.05 + force * 1.1;
          rig.rightArm.rotation.z = 0.35;
          rig.rightElbow.rotation.x = 0.15 + force * 0.4;
          rig.racket.rotation.z = -0.4;
        } else if (player.shot === 'dejada') {
          rig.rightArm.rotation.x = 0.65 + force * 0.4;
          rig.rightArm.rotation.z = 0.2;
          rig.rightElbow.rotation.x = 0.35;
          rig.body.rotation.x = -0.12;
        } else {
          rig.rightArm.rotation.x = 0.36 + force * 0.7;
          rig.rightArm.rotation.y = -1.25 * swing + 0.8 * (1 - swing);
          rig.rightArm.rotation.z = 0.75 - force * 0.35;
          rig.rightElbow.rotation.x = 0.48 - force * 0.25;
          rig.leftArm.rotation.z = -0.52;
          rig.racket.rotation.y = -0.7 * swing;
        }
      } else {
        rig.head.rotation.x = THREE.MathUtils.clamp(
          (state.ball.y - 1.8) * 0.025,
          -0.07,
          0.2,
        );
      }
      // Padel service is visibly underhand: release, floor bounce, below-waist sweep.
      if (
        i === state.server &&
        (state.phase === 'serve' || (state.rally === 1 && swing > 0.05))
      ) {
        const progress =
          state.phase === 'serve' ? state.serviceMotion : 1 + (1 - swing) * 0.5;
        rig.body.rotation.x = -0.08;
        rig.leftArm.rotation.x = progress < 0.55 ? 0.68 : 0.22;
        rig.leftElbow.rotation.x = 0.23;
        rig.rightArm.rotation.x =
          -0.38 + clamp((progress - 0.55) / 0.7, 0, 1) * 1.0;
        rig.rightArm.rotation.y = -0.12;
        rig.rightArm.rotation.z = 0.25;
        rig.rightElbow.rotation.x = 0.1;
        rig.racket.rotation.set(Math.PI + 0.2, 0, -0.2);
      }
      this.lookDirection.set(
        state.ball.x - player.x,
        0,
        state.ball.z - player.z,
      );
      const targetHeadAngle =
        Math.atan2(-this.lookDirection.x, -this.lookDirection.z) -
        rig.root.rotation.y;
      rig.head.rotation.y = Math.sin(targetHeadAngle) * 0.4;
      rig.shadow.position.set(player.x, 0.033, player.z);
      rig.shadow.scale.set(1, 1.05, 1);
      rig.ring.visible = i === state.controlled;
      rig.ring.position.set(player.x, 0.037, player.z);
      (rig.ring.material as THREE.MeshBasicMaterial).opacity =
        0.7 + Math.sin(time * 3) * 0.1;
    }
    const ball = state.ball;
    this.ball.position.set(ball.x, Math.max(0.075, ball.y), ball.z);
    this.ball.rotation.x += dt * (ball.vz || 0) * 2;
    this.ball.rotation.z -= dt * (ball.vx || 0) * 2;
    // Slight visual enlargement keeps the physics ball readable from the broadcast camera.
    this.ball.scale.setScalar(this.cameraMode === 'cenital' ? 1.18 : 1);
    this.ballShadow.position.set(ball.x, 0.036, ball.z);
    const shadowSize = 1 + Math.min(ball.y, 12) * 0.1;
    this.ballShadow.scale.setScalar(shadowSize);
    (this.ballShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(
      0.15,
      0.65 - ball.y * 0.045,
    );
    const airborne = state.phase === 'rally' && ball.y > 1.4;
    this.landing.visible = airborne;
    if (airborne) {
      const flight =
        ((ball.vy || 0) +
          Math.sqrt((ball.vy || 0) ** 2 + 2 * 9.81 * Math.max(0, ball.y))) /
        9.81;
      const lx = ball.x + ball.vx * flight,
        lz = ball.z + ball.vz * flight;
      this.landing.visible = Math.abs(lx) < 5 && Math.abs(lz) < 10;
      this.landing.position.set(lx, 0.027, lz);
      this.landing.scale.setScalar(1 + 0.09 * Math.sin(time * 7));
    }
    this.trailHistory.unshift(this.ball.position.clone());
    if (this.trailHistory.length > 12) this.trailHistory.pop();
    const trailArray = this.trail.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 0; i < 12; i++) {
      const p = this.trailHistory[Math.min(i, this.trailHistory.length - 1)];
      trailArray.setXYZ(i, p.x, p.y, p.z);
    }
    trailArray.needsUpdate = true;
    this.trail.visible =
      state.phase === 'rally' && Math.hypot(ball.vx, ball.vy, ball.vz) > 15;
    this.updateCamera(ball.x, ball.z, dt);
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(ballX: number, ballZ: number, dt: number) {
    const narrow = this.camera.aspect < 1.1;
    if (this.cameraMode === 'cenital') {
      this.desiredCamera.set(0, narrow ? 32 : 29, 0.1);
      this.desiredTarget.set(0, 0, 0);
      this.camera.fov = narrow ? 48 : 47;
    } else if (this.cameraMode === 'cerca') {
      this.desiredCamera.set(
        2.2 + clamp(ballX * 0.12, -0.4, 0.4),
        narrow ? 13 : 9.2,
        narrow ? 26 : 22.5,
      );
      this.desiredTarget.set(0.5, 0.2, 2);
      this.camera.fov = narrow ? 60 : 42;
    } else {
      this.desiredCamera.set(
        clamp(ballX * 0.05, -0.24, 0.24),
        narrow ? 21 : 10,
        narrow ? 28 : 21,
      );
      this.desiredTarget.set(0, narrow ? 0.55 : 0, narrow ? -0.3 : 2);
      this.camera.fov = narrow ? 48 : 40;
    }
    this.cameraPosition.lerp(this.desiredCamera, 1 - Math.exp(-dt * 3.2));
    this.cameraTarget.lerp(this.desiredTarget, 1 - Math.exp(-dt * 3));
    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material)
        (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        ).forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
