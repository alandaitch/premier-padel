import * as THREE from 'three';
import { COURT, type GameState } from './physics';
import { matchAppearances, type PlayerAppearance } from './player-profiles';

type CameraMode = 'tv' | 'cerca' | 'cenital';
export type ChargePreview = {
  active: boolean;
  progress: number;
  aim: number;
  smash: boolean;
};
type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  chest: THREE.Group;
  upper: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightAnkle: THREE.Group;
  dominantArm: THREE.Group;
  dominantElbow: THREE.Group;
  racket: THREE.Group;
  shadow: THREE.Mesh;
  ring: THREE.Mesh;
  gaitPhase: number;
  profile: PlayerAppearance;
  bodyScale: number;
  hand: number;
  backhand: boolean;
  contactStamp: number;
  leftPlant: THREE.Vector3;
  rightPlant: THREE.Vector3;
  leftPlanted: boolean;
  rightPlanted: boolean;
  feetReady: boolean;
  load: number;
};

type ContactRecord = {
  x: number;
  y: number;
  z: number;
  time: number;
  playerId: number;
  shot: string;
  quality?: string;
};
type BounceRecord = {
  x: number;
  y: number;
  z: number;
  time: number;
  surface: 'suelo' | 'vidrio' | 'malla' | 'red';
};
type TacticalView = GameState & {
  contactPoint?: ContactRecord | null;
  lastBounce?: BounceRecord | null;
  lastHitterId?: number;
};
type ImpactPulse = {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  started: number;
  wall: boolean;
};

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const BALL_RADIUS = 0.033;

/** Tournament presentation. The physics engine remains the sole owner of play state. */
export class PadelRenderer {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 170);
  private renderer: THREE.WebGLRenderer;
  private court = new THREE.Group();
  private rigs: Rig[] = [];
  private ball: THREE.Mesh;
  private ballViewPosition = new THREE.Vector3();
  private viewportSize = new THREE.Vector2();
  private ballShadow: THREE.Mesh;
  private landing: THREE.Mesh;
  private trail: THREE.Line;
  private trailHistory: THREE.Vector3[] = [];
  private impactPulses: ImpactPulse[] = [];
  private lastBounceKey = '';
  private lastSceneTime = -1;
  private lastPhase = '';
  private armTarget = new THREE.Vector3();
  private armDirection = new THREE.Vector3();
  private contactDirection = new THREE.Vector3();
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
  private charge: ChargePreview = {
    active: false,
    progress: 0,
    aim: 0,
    smash: false,
  };
  private aimArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(),
    1,
    0xd5ef85,
    0.4,
    0.2,
  );
  private aimTarget = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.28, 48),
    new THREE.MeshBasicMaterial({
      color: 0xd5ef85,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  private perfectRings: THREE.Mesh<
    THREE.RingGeometry,
    THREE.MeshBasicMaterial
  >[] = [];
  private perfectLight = new THREE.PointLight(0xffe7a6, 0, 3, 2);
  private perfectAt = -100;
  private perfectKey = '';
  private exteriorFocus = 0;

  constructor(
    private container: HTMLElement,
    options?: {
      quality?: 'alta' | 'media';
      venue?: string;
      players?: PlayerAppearance[];
    },
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
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
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
    this.scene.add(this.aimArrow, this.aimTarget, this.perfectLight);
    this.aimTarget.rotation.x = -Math.PI / 2;
    this.aimArrow.visible = this.aimTarget.visible = false;
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.13, 0.148, 48),
        new THREE.MeshBasicMaterial({
          color: i ? 0xffffff : 0xffd46b,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.visible = false;
      this.perfectRings.push(ring);
      this.scene.add(ring);
    }
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
    this.setPlayers(options?.players ?? matchAppearances(0, 1));
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 18, 14),
      new THREE.MeshStandardMaterial({
        color: 0xe1ff3d,
        emissive: 0xa9c91c,
        emissiveIntensity: 0.17,
        roughness: 0.98,
      }),
    );
    this.ball.castShadow = true;
    // Size assistance uses the actual render camera, including the close pose viewer.
    this.ball.onBeforeRender = (_renderer, _scene, camera) => {
      this.updateBallScale(camera);
    };
    // Two curved seams remain visible in close view.
    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(0.032, 0.0011, 4, 28),
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
      new THREE.Float32BufferAttribute(new Float32Array(20 * 3), 3),
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
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.09, 0.12, 40),
        new THREE.MeshBasicMaterial({
          color: 0xdbf7ce,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      mesh.visible = false;
      this.scene.add(mesh);
      this.impactPulses.push({ mesh, started: -10, wall: false });
    }
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
    this.hemisphere = new THREE.HemisphereLight(0xe6f0ff, 0x2c3947, 1.4);
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
    sun.shadow.normalBias = 0.012;
    sun.shadow.bias = -0.0001;
    sun.shadow.radius = 4;
    sun.shadow.intensity = 0.62;
    this.scene.add(sun);
    const fill = (this.fillLight = new THREE.DirectionalLight(0xc4e0ff, 1.2));
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
    const field = this.box(10, 0.1, 20, this.fieldMaterial, 0, -0.05, 0);
    field.receiveShadow = true;
    // Alternating very subtle brushed carpet bands, as seen under competition floodlights.
    const stripeMaterial = new THREE.MeshBasicMaterial({
      color: 0x7ab3db,
      transparent: true,
      opacity: 0.025,
      depthWrite: false,
    });
    for (let z = -9; z < 10; z += 4)
      this.box(10, 0.002, 2, stripeMaterial, 0, 0.0015, z);
    const line = this.material(0xeef5f4, 0.95);
    for (const z of [-6.95, 6.95]) {
      this.box(10, 0.003, 0.05, line, 0, 0.003, z);
      this.box(0.05, 0.003, 6.95, line, 0, 0.003, z / 2);
      this.box(0.05, 0.003, 0.22, line, 0, 0.003, z + Math.sign(z) * 0.11);
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
    const doorWidth = COURT.doorMaxZ - COURT.doorMinZ;
    const doorCenter = (COURT.doorMaxZ + COURT.doorMinZ) / 2;
    // Regulation sides: corner glazing, wire panels, and playable exit doors near the net.
    for (const x of [-5, 5]) {
      for (const z of [-8, 8]) {
        const side = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), glass);
        side.rotation.y = Math.PI / 2;
        side.position.set(x, 1.5, z);
        this.court.add(side);
        this.addMeshFence(4, 1, x, 3.5, z, Math.PI / 2, 0.2);
      }
      // Two 1.10 m openings per side, separated by the net post.
      for (const side of [-1, 1]) {
        this.addMeshFence(
          6 - COURT.doorMaxZ,
          3,
          x,
          1.5,
          (side * (6 + COURT.doorMaxZ)) / 2,
          Math.PI / 2,
          0.25,
        );
        this.addMeshFence(
          doorWidth,
          3 - COURT.doorHeight,
          x,
          (3 + COURT.doorHeight) / 2,
          side * doorCenter,
          Math.PI / 2,
          0.25,
        );
        this.box(
          0.055,
          0.06,
          doorWidth,
          black,
          x,
          COURT.doorHeight + 0.03,
          side * doorCenter,
        );
      }
      this.addMeshFence(COURT.doorMinZ * 2, 3, x, 1.5, 0, Math.PI / 2, 0.2);
      for (const side of [-1, 1])
        this.box(0.07, 0.085, 4.8, black, x, 0.043, side * 3.6);
      for (const z of [
        -10,
        -8,
        -6,
        -4,
        -2,
        -COURT.doorMaxZ - 0.0275,
        -COURT.doorMinZ + 0.0275,
        COURT.doorMinZ - 0.0275,
        COURT.doorMaxZ + 0.0275,
        2,
        4,
        6,
        8,
        10,
      ]) {
        const height = Math.abs(z) >= 6 ? 4 : 3;
        this.box(0.055, height, 0.055, black, x, height / 2, z);
      }
      for (const z of [-5, 5]) this.box(0.06, 0.06, 10, black, x, 3, z);
      for (const z of [-8, 8]) this.box(0.06, 0.06, 4, black, x, 4, z);
      // Safe external recovery area remains free of furniture and railings.
      const exteriorMaterial = this.fieldMaterial.clone();
      exteriorMaterial.color.setHex(0x537582);
      const exterior = this.box(
        4,
        0.08,
        8,
        exteriorMaterial,
        x + Math.sign(x) * 2,
        -0.04,
        0,
      );
      exterior.receiveShadow = true;
      const edge = this.material(0x54869c, 0.97);
      for (const z of [-4, 4])
        this.box(4, 0.012, 0.04, edge, x + Math.sign(x) * 2, 0.018, z);
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
      [7, 0.6],
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
    const tapeGeometry = new THREE.PlaneGeometry(10, 0.06, 60, 1);
    const tapePositions = tapeGeometry.attributes.position;
    for (let i = 0; i < tapePositions.count; i++) {
      const x = tapePositions.getX(i),
        top = 0.88 + 0.04 * (x / 5) ** 2;
      tapePositions.setY(i, top + (tapePositions.getY(i) > 0 ? 0 : -0.06));
    }
    const tape = new THREE.Mesh(
      tapeGeometry,
      new THREE.MeshStandardMaterial({
        color: 0xf1f2e8,
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    tape.castShadow = true;
    this.court.add(tape);
    for (const x of [-5.02, 5.02]) {
      this.cylinder(0.045, 0.045, 1.05, black, this.court, x, 0.525, 0);
      this.box(0.14, 0.045, 0.16, black, x, 0.0225, 0);
      const netLogo = this.makeBanner(
        'PREMIER',
        0.5,
        0.095,
        '#f4f4eb',
        '#20342d',
        60,
      );
      netLogo.position.set(x > 0 ? 4.5 : -4.5, 0.865, 0.019);
      this.court.add(netLogo);
    }
    // Lower LED ribbons sit behind the glass; their silhouettes never hide the ball.
    for (const z of [-10.25, 10.25]) {
      const board = this.makeBanner(
        'QATAR AIRWAYS      •      PREMIER PADEL      •      QATAR AIRWAYS',
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
          z < 0 ? 'Wilson' : 'BULLPADEL',
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
    for (const x of [-10.2, 10.2]) {
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
        this.material(0x263e4b),
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
      -10.15,
      1.75,
      0,
      this.scene,
    );
    for (const z of [-0.34, 0.34])
      this.box(0.05, 1.75, 0.05, metal, -10.35, 0.875, z, this.scene);
    for (let y = 0.2; y < 1.7; y += 0.3)
      this.box(0.45, 0.04, 0.04, metal, -9.96, y, 0.4, this.scene);
    this.box(0.05, 0.7, 0.8, black, -10.48, 2.06, 0, this.scene);
    this.makeStaff(-10.16, 1.78, 0, Math.PI / 2, true);
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
    const spacing = 0.05;
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
    const bannerMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    bannerMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
        vec2 bannerUv=vMapUv;
        if(!gl_FrontFacing)bannerUv.x=1.0-bannerUv.x;
        diffuseColor*=texture2D(map,bannerUv);
      #endif`,
      );
    };
    bannerMaterial.customProgramCacheKey = () => 'readable-banner-v5';
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      bannerMaterial,
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
        const x = side * (10.6 + row * 0.85);
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
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.115, -0.245),
          new THREE.Vector2(0.14, -0.12),
          new THREE.Vector2(0.176, 0.12),
          new THREE.Vector2(0.17, 0.18),
          new THREE.Vector2(0.09, 0.24),
        ],
        12,
      ),
      this.material(0xffffff),
      750,
    );
    const crowdHead = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.11, 7, 6),
      this.material(0xffffff),
      750,
    );
    const crowdHair = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.113, 9, 7),
      this.material(0xffffff, 0.96),
      750,
    );
    const crowdHands = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.042, 8, 6),
      this.material(0xffffff, 0.78),
      1500,
    );
    let crowdHandCount = 0;
    const crowdLegs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.25, 0.29, 0.32),
      this.material(0xffffff),
      750,
    );
    const crowdClothLimbs = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 0.9, 1, 8),
      this.material(0xffffff),
      4500,
    );
    const crowdSkinLimbs = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 0.84, 1, 8),
      this.material(0xffffff),
      1500,
    );
    const limbPose = new THREE.Object3D();
    let clothLimbCount = 0,
      skinLimbCount = 0;
    const addLimb = (
      mesh: THREE.InstancedMesh,
      index: number,
      a: THREE.Vector3,
      b: THREE.Vector3,
      radius: number,
      color: THREE.Color,
      x: number,
      y: number,
      z: number,
      rotation: number,
    ) => {
      const axis = new THREE.Vector3(0, 1, 0);
      a.applyAxisAngle(axis, rotation).add(new THREE.Vector3(x, y, z));
      b.applyAxisAngle(axis, rotation).add(new THREE.Vector3(x, y, z));
      limbPose.position.copy(a).add(b).multiplyScalar(0.5);
      limbPose.quaternion.setFromUnitVectors(
        axis,
        b.clone().sub(a).normalize(),
      );
      limbPose.scale.set(radius, a.distanceTo(b), radius);
      limbPose.updateMatrix();
      mesh.setMatrixAt(index, limbPose.matrix);
      mesh.setColorAt(index, color);
    };
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
        dummy.position.set(x + (this.random() - 0.5) * 0.05, row.y + 0.61, z);
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
        const hairChoice = this.random();
        dummy.position.y += 0.047;
        dummy.scale.set(1, hairChoice < 0.22 ? 1.2 : 0.73, 0.98);
        dummy.updateMatrix();
        crowdHair.setMatrixAt(spectator, dummy.matrix);
        crowdHair.setColorAt(
          spectator,
          new THREE.Color(
            hairChoice < 0.17
              ? 0x6e5641
              : hairChoice < 0.32
                ? 0xaaa49b
                : hairChoice < 0.44
                  ? 0x9d793e
                  : 0x292522,
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
        const shirtColor = new THREE.Color(),
          skinColor = new THREE.Color();
        crowdBody.getColorAt(spectator, shirtColor);
        crowdHead.getColorAt(spectator, skinColor);
        const trousers = new THREE.Color(
          this.random() > 0.4 ? 0x1b2b3b : 0x48525d,
        );
        const gesture = this.random();
        for (const sign of [-1, 1]) {
          const elbowY = gesture < 0.16 ? 0.7 : gesture < 0.3 ? 0.55 : 0.48;
          const handY = gesture < 0.16 ? 0.84 : gesture < 0.3 ? 0.75 : 0.37;
          const handX = gesture < 0.16 ? 0.055 : gesture < 0.3 ? 0.06 : 0.15;
          addLimb(
            crowdClothLimbs,
            clothLimbCount++,
            new THREE.Vector3(sign * 0.17, 0.77, 0),
            new THREE.Vector3(sign * 0.21, elbowY, 0.07),
            0.049,
            shirtColor,
            x,
            row.y,
            z,
            row.rot,
          );
          addLimb(
            crowdSkinLimbs,
            skinLimbCount++,
            new THREE.Vector3(sign * 0.21, elbowY, 0.07),
            new THREE.Vector3(sign * handX, handY, 0.27),
            0.038,
            skinColor,
            x,
            row.y,
            z,
            row.rot,
          );
          const palm = new THREE.Vector3(
            sign * handX,
            handY,
            0.27,
          ).applyAxisAngle(new THREE.Vector3(0, 1, 0), row.rot);
          dummy.position.set(x + palm.x, row.y + palm.y, z + palm.z);
          dummy.rotation.set(0, row.rot, 0);
          dummy.scale.set(0.7, 1, 0.68);
          dummy.updateMatrix();
          crowdHands.setMatrixAt(crowdHandCount, dummy.matrix);
          crowdHands.setColorAt(crowdHandCount++, skinColor);
          addLimb(
            crowdClothLimbs,
            clothLimbCount++,
            new THREE.Vector3(sign * 0.095, 0.31, 0),
            new THREE.Vector3(sign * 0.105, 0.3, 0.3),
            0.067,
            trousers,
            x,
            row.y,
            z,
            row.rot,
          );
          addLimb(
            crowdClothLimbs,
            clothLimbCount++,
            new THREE.Vector3(sign * 0.105, 0.3, 0.3),
            new THREE.Vector3(sign * 0.105, 0.015, 0.34),
            0.052,
            trousers,
            x,
            row.y,
            z,
            row.rot,
          );
        }
        spectator++;
      }
    }
    seats.count = backs.count = seatIndex;
    crowdBody.count =
      crowdHead.count =
      crowdLegs.count =
      crowdHair.count =
        spectator;
    crowdHands.count = crowdHandCount;
    crowdClothLimbs.count = clothLimbCount;
    crowdSkinLimbs.count = skinLimbCount;
    this.scene.add(
      seats,
      backs,
      crowdBody,
      crowdHead,
      crowdLegs,
      crowdClothLimbs,
      crowdSkinLimbs,
      crowdHair,
      crowdHands,
    );
    for (const x of [-9.9, 9.9]) {
      this.box(0.05, 0.05, 23, rails, x, 1.02, -1.5, this.scene);
      for (let z = -12; z < 11; z += 2)
        this.box(0.05, 1, 0.05, rails, x, 0.5, z, this.scene);
      const panel = this.makeBanner(
        'QATAR AIRWAYS     •     Red Bull     •     Wilson     •     MONDO',
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

  private anatomicalSurface(
    rings: Array<[number, number, number]>,
    material: THREE.Material,
    parent: THREE.Object3D,
    wrinkles = false,
  ) {
    const vertices: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    const segments = 32;
    for (let row = 0; row < rings.length; row++) {
      const [y, radiusX, radiusZ] = rings[row];
      for (let col = 0; col <= segments; col++) {
        const theta = (col / segments) * TAU;
        const fold = wrinkles
          ? 1 +
            0.017 *
              Math.sin(theta * 9 + y * 47) *
              Math.sin((row / (rings.length - 1)) * Math.PI)
          : 1;
        vertices.push(
          Math.sin(theta) * radiusX * fold,
          y,
          -Math.cos(theta) * radiusZ * fold,
        );
        uv.push(col / segments, row / (rings.length - 1));
        if (row < rings.length - 1 && col < segments) {
          const a = row * (segments + 1) + col,
            b = a + segments + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private uniformTexture(profile: PlayerAppearance) {
    return this.textureCanvas(512, (ctx, size) => {
      const kit = profile.kit;
      ctx.fillStyle = kit.shirt;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = kit.accent;
      if (kit.pattern === 'diagonal') {
        for (const x of [-30, 250]) {
          ctx.beginPath();
          ctx.moveTo(x, 60);
          ctx.lineTo(x + 75, 60);
          ctx.lineTo(x + 230, 510);
          ctx.lineTo(x + 140, 510);
          ctx.fill();
        }
      } else if (kit.pattern === 'shoulder') {
        for (const x of [110, 374])
          for (let stripe = 0; stripe < 3; stripe++)
            ctx.fillRect(x + stripe * 9, 0, 5, 180);
      } else if (kit.pattern === 'blocks') {
        ctx.fillRect(0, 0, size, 95);
        ctx.fillRect(0, 385, size, 127);
        ctx.globalAlpha = 0.38;
        for (let y = 105; y < 385; y += 13) ctx.fillRect(0, y, size, 2);
        ctx.beginPath();
        ctx.moveTo(0, 220);
        ctx.lineTo(size, 330);
        ctx.lineTo(size, 370);
        ctx.lineTo(0, 260);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Woven grain, seam stitching and broad compression folds keep the shirt fabric-like.
      for (let y = 0; y < size; y += 3) {
        ctx.fillStyle = y % 2 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.055)';
        ctx.fillRect(0, y, size, 1);
      }
      for (const x of [118, 388]) {
        ctx.strokeStyle = 'rgba(15,22,26,.28)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.quadraticCurveTo(x + 17, 250, x - 7, 500);
        ctx.stroke();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = 'rgba(255,255,255,.30)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const y of [330, 392, 462]) {
        const gradient = ctx.createLinearGradient(0, y - 10, 0, y + 12);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.45, 'rgba(0,0,0,.14)');
        gradient.addColorStop(0.57, 'rgba(255,255,255,.1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y - 10, size, 22);
      }
    });
  }

  private playerLabel(
    text: string,
    width: number,
    height: number,
    ink: string,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (text === 'QATAR AIRWAYS') {
      ctx.font = '600 70px Georgia';
      ctx.fillText('QATAR', 256, 43, 470);
      ctx.font = '500 29px Arial';
      ctx.fillText('A I R W A Y S', 256, 104, 390);
    } else if (text.toLowerCase() === 'adidas') {
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(70 + i * 28, 80 - i * 15);
        ctx.rotate(-0.4);
        ctx.fillRect(-10, -24 - i * 8, 19, 42 + i * 9);
        ctx.restore();
      }
      ctx.font = '700 65px Arial';
      ctx.fillText('adidas', 322, 73, 335);
    } else if (text === 'HEAD') {
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(95, 67, 34, Math.PI, TAU);
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.fillRect(90, 42, 10, 55);
      ctx.font = '800 67px Arial';
      ctx.fillText(text, 320, 70, 335);
    } else {
      ctx.font =
        text === 'Reserve'
          ? '500 72px Georgia'
          : text === 'NOX'
            ? 'italic 900 80px Arial'
            : '800 64px Arial';
      ctx.fillText(text, 256, 68, 490);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        roughness: 0.94,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
  }

  private featureCurve(
    points: number[][],
    radius: number,
    material: THREE.Material,
    parent: THREE.Object3D,
  ) {
    const path = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    const feature = new THREE.Mesh(
      new THREE.TubeGeometry(path, 20, radius, 6, false),
      material,
    );
    parent.add(feature);
    return feature;
  }

  private buildFaceFeatures(
    profile: PlayerAppearance,
    head: THREE.Group,
    skin: THREE.Material,
    darkSkin: THREE.Material,
    hair: THREE.Material,
  ) {
    const ratios = profile.face ?? {
      jaw: 1,
      nose: 1,
      eyes: 1,
      brow: 1,
      lip: 1,
    };
    // Outer ear and concha surround the sculpted facial surface.
    for (const side of [-1, 1]) {
      this.sphere(0.016, 0.032, 0.022, skin, head, side * 0.115, 0.003, 0.002);
      this.sphere(
        0.008,
        0.019,
        0.009,
        darkSkin,
        head,
        side * 0.121,
        0.003,
        -0.006,
      );
      this.featureCurve(
        [
          [side * 0.126, 0.026, -0.001],
          [side * 0.132, 0.007, -0.003],
          [side * 0.125, -0.022, -0.004],
        ],
        0.0035,
        skin,
        head,
      );
    }

    // A tapered bridge and nasal wings replace the former ball-shaped nose.
    const noseGeometry = new THREE.BufferGeometry();
    noseGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          -0.012,
          0.048,
          -0.105,
          0.012,
          0.048,
          -0.105,
          -0.02,
          -0.028,
          -0.106,
          0.02,
          -0.028,
          -0.106,
          0,
          0.031,
          -0.13,
          0,
          -0.018,
          -0.153 * ratios.nose,
          -0.013,
          -0.027,
          -0.133,
          0.013,
          -0.027,
          -0.133,
        ],
        3,
      ),
    );
    noseGeometry.setIndex([
      0, 4, 1, 0, 2, 6, 0, 6, 4, 4, 6, 5, 4, 5, 7, 4, 7, 1, 1, 7, 3, 2, 3, 7, 2,
      7, 6, 6, 7, 5,
    ]);
    const noseIndices = noseGeometry.index!;
    for (let i = 0; i < noseIndices.count; i += 3) {
      const b = noseIndices.getX(i + 1);
      noseIndices.setX(i + 1, noseIndices.getX(i + 2));
      noseIndices.setX(i + 2, b);
    }
    noseGeometry.computeVertexNormals();
    head.add(new THREE.Mesh(noseGeometry, skin));
    for (const side of [-1, 1]) {
      this.sphere(
        0.009,
        0.006,
        0.011,
        skin,
        head,
        side * 0.016,
        -0.025,
        -0.124,
      );
      this.sphere(
        0.004,
        0.0025,
        0.005,
        darkSkin,
        head,
        side * 0.013,
        -0.03,
        -0.132,
      );
    }
    const sclera = this.material(0xbdb8a9, 0.8),
      iris = this.material(0x433a28, 0.53),
      pupil = this.material(0x181614, 0.42);
    const browMaterial = this.material(
      new THREE.Color(profile.hair).multiplyScalar(0.75),
      0.97,
    );
    for (const side of [-1, 1]) {
      const x = side * 0.041 * ratios.eyes;
      this.sphere(0.018, 0.0064, 0.0055, sclera, head, x, 0.028, -0.108);
      this.sphere(0.0058, 0.0057, 0.003, iris, head, x, 0.028, -0.113);
      this.sphere(0.0028, 0.0034, 0.0015, pupil, head, x, 0.028, -0.115);
      this.featureCurve(
        [
          [x - 0.019, 0.027, -0.106],
          [x - 0.006, 0.035, -0.111],
          [x + 0.009, 0.034, -0.11],
          [x + 0.019, 0.027, -0.105],
        ],
        0.0025,
        skin,
        head,
      );
      this.featureCurve(
        [
          [x - 0.018, 0.025, -0.106],
          [x, 0.022, -0.111],
          [x + 0.018, 0.025, -0.106],
        ],
        0.0018,
        darkSkin,
        head,
      );
      const brow = this.featureCurve(
        [
          [x - 0.022, 0.045, -0.106],
          [x - 0.005, 0.052, -0.112],
          [x + 0.013, 0.05, -0.109],
          [x + 0.022, 0.044, -0.104],
        ],
        0.0037 * ratios.brow,
        browMaterial,
        head,
      );
      brow.rotation.z = side * 0.045;
    }
    const lips = this.material(
      new THREE.Color(profile.skin).lerp(new THREE.Color(0x814d42), 0.47),
      0.74,
    );
    const width = 0.024 * ratios.lip;
    this.featureCurve(
      [
        [-width, -0.065, -0.098],
        [-0.007, -0.062, -0.104],
        [0, -0.064, -0.106],
        [0.007, -0.062, -0.104],
        [width, -0.065, -0.098],
      ],
      0.0028,
      lips,
      head,
    );
    this.featureCurve(
      [
        [-width * 0.9, -0.067, -0.098],
        [0, -0.071, -0.104],
        [width * 0.9, -0.067, -0.098],
      ],
      0.0035,
      lips,
      head,
    );
    this.featureCurve(
      [
        [-width * 0.8, -0.065, -0.102],
        [0, -0.066, -0.106],
        [width * 0.8, -0.065, -0.102],
      ],
      0.0013,
      darkSkin,
      head,
    );
    // Fine hair strands follow the crown instead of appearing as isolated blocks.
    for (let i = 0; i < 18; i++) {
      const x = (i - 8.5) * 0.01;
      const crown = 0.165 + Math.sqrt(Math.max(0, 0.011 - x * x)) * 0.17;
      this.featureCurve(
        [
          [x, 0.102, -0.087],
          [x - 0.006, crown, -0.066],
          [x - 0.012, crown + 0.008, 0.012],
          [x - 0.008, 0.128, 0.078],
        ],
        0.0018,
        hair,
        head,
      );
    }
  }

  private makePlayer(index: number, profile: PlayerAppearance): Rig {
    const root = new THREE.Group(),
      body = new THREE.Group(),
      chest = new THREE.Group(),
      upper = new THREE.Group();
    root.name = profile.name;
    root.userData.playerId = profile.id;
    root.add(body);
    body.add(chest);
    chest.position.y = 0.17;
    chest.add(upper);
    upper.position.y = -0.17;
    const bodyScale = profile.height / 1.95;
    const girth =
      profile.build === 'compact'
        ? 1.055
        : profile.build === 'tall'
          ? 0.965
          : 1;
    root.scale.set(bodyScale * girth, bodyScale, bodyScale);
    const hand = profile.handedness === 'left' ? -1 : 1;
    const skinMap = this.textureCanvas(256, (ctx, size) => {
      ctx.fillStyle = profile.skin;
      ctx.fillRect(0, 0, size, size);
      for (let n = 0; n < 14000; n++) {
        ctx.fillStyle =
          this.random() > 0.5 ? 'rgba(255,226,204,.055)' : 'rgba(96,46,24,.04)';
        ctx.fillRect(
          this.random() * size,
          this.random() * size,
          0.5 + this.random(),
          0.5 + this.random(),
        );
      }
    });
    const skin = new THREE.MeshStandardMaterial({
      map: skinMap,
      roughness: 0.6,
    });
    const darkSkin = this.material(
      new THREE.Color(profile.skin).multiplyScalar(0.76),
      0.85,
    );
    const shirt = new THREE.MeshPhysicalMaterial({
      map: this.uniformTexture(profile),
      roughness: 0.92,
      sheen: 0.72,
      sheenColor: new THREE.Color(profile.kit.shirt).lerp(
        new THREE.Color(0xffffff),
        0.25,
      ),
      sheenRoughness: 0.85,
    });
    const shorts = this.material(profile.kit.shorts, 0.96);
    const socks = this.material(0xe4e8e3, 0.98);
    const shoes = this.material(0xe9eee7, 0.73);
    const trim = this.material(profile.kit.accent, 0.79);
    const hair = this.material(profile.hair, 0.95);
    // Thorax, waist and shoulder bridge are one continuous surface, with actual cloth folds.
    this.anatomicalSurface(
      [
        [0.145, 0.195, 0.126],
        [0.2, 0.195, 0.129],
        [0.28, 0.194, 0.137],
        [0.38, 0.213, 0.149],
        [0.49, 0.239, 0.158],
        [0.59, 0.259, 0.159],
        [0.65, 0.258, 0.145],
        [0.695, 0.199, 0.116],
        [0.725, 0.096, 0.079],
      ],
      shirt,
      upper,
      true,
    );
    const pelvis = this.cylinder(
      0.207,
      0.198,
      0.23,
      shorts,
      body,
      0,
      0.065,
      0,
      24,
    );
    pelvis.scale.z = 0.8;
    const waist = this.cylinder(
      0.204,
      0.204,
      0.028,
      trim,
      body,
      0,
      0.163,
      0,
      24,
    );
    waist.scale.z = 0.65;
    const sponsor = this.playerLabel(
      profile.kit.sponsor,
      0.33,
      0.072,
      profile.kit.ink,
    );
    sponsor.position.set(0, 0.48, -0.166);
    sponsor.rotation.y = Math.PI;
    upper.add(sponsor);
    const brand = this.playerLabel(
      profile.kit.brand,
      0.11,
      0.033,
      profile.kit.ink,
    );
    brand.position.set(0.122, 0.62, -0.139);
    brand.rotation.y = Math.PI;
    upper.add(brand);
    const surname = this.playerLabel(
      profile.surname.toUpperCase(),
      0.31,
      0.058,
      profile.kit.ink,
    );
    surname.position.set(0, 0.54, 0.169);
    upper.add(surname);
    const backBrand = this.playerLabel(
      profile.id === 'galan' ? profile.kit.sponsor : profile.kit.brand,
      0.21,
      0.057,
      profile.kit.ink,
    );
    backBrand.position.set(0, 0.34, 0.15);
    upper.add(backBrand);
    this.cylinder(0.057, 0.07, 0.13, skin, upper, 0, 0.77, 0, 20);
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.012, 7, 28),
      trim,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.719, -0.009);
    upper.add(collar);
    const head = new THREE.Group();
    head.position.set(0, 0.885, -0.012);
    head.scale.set(0.8, 0.94, 0.96);
    upper.add(head);
    const angular =
      profile.id.includes('galan') || profile.id.includes('lebron');
    const jaw =
      profile.face?.jaw ??
      (angular ? 1.06 : profile.build === 'compact' ? 0.95 : 1);
    const faceSurface = this.anatomicalSurface(
      [
        [-0.127, 0.039, 0.047],
        [-0.097, 0.073 * jaw, 0.078],
        [-0.052, 0.098 * jaw, 0.096],
        [0.012, 0.112, 0.109],
        [0.065, 0.114, 0.11],
        [0.114, 0.099, 0.098],
        [0.159, 0.039, 0.043],
        [0.17, 0.003, 0.004],
      ].flatMap((ring, i, array) =>
        i === array.length - 1
          ? [ring as [number, number, number]]
          : Array.from(
              { length: 4 },
              (_, step) =>
                ring.map((n, axis) =>
                  THREE.MathUtils.lerp(n, array[i + 1][axis], step / 4),
                ) as [number, number, number],
            ),
      ),
      skin,
      head,
    );
    const facePosition = faceSurface.geometry.attributes.position;
    for (let i = 0; i < facePosition.count; i++) {
      const x = facePosition.getX(i),
        y = facePosition.getY(i),
        z = facePosition.getZ(i);
      if (z >= -0.035) continue;
      const gaussian = (cx: number, cy: number, rx: number, ry: number) =>
        Math.exp(-(((x - cx) / rx) ** 2) - ((y - cy) / ry) ** 2);
      let sculpt = 0;
      for (const side of [-1, 1]) {
        sculpt += 0.009 * gaussian(side * 0.065, -0.004, 0.038, 0.025);
        sculpt += 0.004 * gaussian(side * 0.044, 0.048, 0.03, 0.015);
        sculpt -= 0.002 * gaussian(side * 0.041, 0.028, 0.021, 0.009);
      }
      sculpt += 0.006 * gaussian(0, -0.102, 0.042, 0.022);
      facePosition.setZ(i, z - sculpt);
    }
    faceSurface.geometry.computeVertexNormals();
    this.buildFaceFeatures(profile, head, skin, darkSkin, hair);
    const crownHeight = profile.hairStyle === 'crop' ? 0.184 : 0.201;
    this.anatomicalSurface(
      [
        [0.045, 0.113, 0.086],
        [0.08, 0.12, 0.111],
        [0.124, 0.108, 0.105],
        [crownHeight - 0.019, 0.063, 0.061],
        [crownHeight, 0.003, 0.004],
      ],
      hair,
      head,
    );
    if (profile.hairStyle === 'curly') {
      const curls = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.025, 8, 6),
        hair,
        32,
      );
      const pose = new THREE.Object3D();
      for (let i = 0; i < 32; i++) {
        const angle = i * 2.39996,
          radius = 0.1 * Math.sqrt(i / 32);
        pose.position.set(
          Math.cos(angle) * radius,
          0.149 + Math.sqrt(Math.max(0, 0.01 - radius * radius)) * 0.48,
          Math.sin(angle) * radius,
        );
        pose.scale.set(1, 1.08, 1);
        pose.updateMatrix();
        curls.setMatrixAt(i, pose.matrix);
      }
      head.add(curls);
    } else if (profile.hairStyle === 'swept') {
      const sweep = this.sphere(
        0.105,
        0.052,
        0.085,
        hair,
        head,
        -0.014,
        0.154,
        -0.023,
      );
      sweep.rotation.z = -0.16;
      for (let i = 0; i < 4; i++) {
        const lock = this.sphere(
          0.015,
          0.036,
          0.057,
          hair,
          head,
          -0.06 + i * 0.03,
          0.158,
          -0.046,
        );
        lock.rotation.z = -0.22;
      }
    }
    if (profile.beard !== 'none') {
      const beardMap = this.textureCanvas(128, (ctx, size) => {
        ctx.fillStyle = profile.skin;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = profile.hair;
        ctx.globalAlpha = profile.beard === 'full' ? 0.52 : 0.3;
        for (let j = 0; j < 5200; j++)
          ctx.fillRect(this.random() * size, this.random() * size, 0.7, 1.2);
      });
      const beardMaterial = new THREE.MeshStandardMaterial({
        map: beardMap,
        roughness: 0.98,
      });
      const beardMesh = this.anatomicalSurface(
        [
          [-0.127, 0.04, 0.048],
          [-0.105, 0.076 * jaw, 0.08],
          [-0.076, 0.094 * jaw, 0.097],
          [-0.053, 0.101, 0.102],
        ],
        beardMaterial,
        head,
      );
      const original = beardMesh.geometry.index!,
        positions = beardMesh.geometry.attributes.position,
        kept: number[] = [];
      for (let j = 0; j < original.count; j += 3) {
        const a = original.getX(j),
          b = original.getX(j + 1),
          c = original.getX(j + 2);
        if (
          (positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / 3 <
          0.022
        )
          kept.push(a, b, c);
      }
      beardMesh.geometry.setIndex(kept);
      this.sphere(0.047, 0.008, 0.006, beardMaterial, head, 0, -0.049, -0.106);
    }
    if (profile.headband) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.119, 0.121, 0.027, 28, 1, true),
        this.material(profile.headband),
      );
      band.position.y = 0.072;
      head.add(band);
    }
    const arm = (side: -1 | 1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.256, 0.639, 0);
      upper.add(shoulder);
      this.anatomicalSurface(
        [
          [-0.143, 0.076, 0.075],
          [-0.09, 0.084, 0.082],
          [-0.03, 0.088, 0.083],
          [0.025, 0.071, 0.068],
          [0.062, 0.014, 0.014],
        ],
        shirt,
        shoulder,
      );
      this.anatomicalSurface(
        [
          [-0.321, 0.054, 0.052],
          [-0.275, 0.061, 0.057],
          [-0.205, 0.071, 0.065],
          [-0.138, 0.076, 0.07],
        ],
        skin,
        shoulder,
      );
      const elbow = new THREE.Group();
      elbow.position.y = -0.32;
      shoulder.add(elbow);
      this.sphere(0.05, 0.049, 0.047, skin, elbow);
      this.anatomicalSurface(
        [
          [-0.292, 0.037, 0.033],
          [-0.24, 0.041, 0.037],
          [-0.16, 0.049, 0.045],
          [-0.09, 0.056, 0.05],
          [-0.015, 0.054, 0.05],
          [0.012, 0.047, 0.045],
        ],
        skin,
        elbow,
      );
      this.cylinder(0.044, 0.042, 0.055, socks, elbow, 0, -0.229, 0, 18);
      this.sphere(0.042, 0.064, 0.034, skin, elbow, 0, -0.288, -0.01);
      this.sphere(
        0.025,
        0.038,
        0.025,
        skin,
        elbow,
        side * -0.035,
        -0.274,
        -0.019,
      );
      for (let digit = 0; digit < 4; digit++) {
        const dominant = side === hand;
        const finger = this.cylinder(
          0.0085,
          0.007,
          dominant ? 0.026 : 0.04,
          skin,
          elbow,
          (digit - 1.5) * 0.016,
          dominant ? -0.32 : -0.349,
          dominant ? -0.027 : -0.011,
          10,
        );
        finger.rotation.x = dominant ? 0.86 : 0.1;
        this.sphere(
          0.008,
          0.009,
          0.008,
          skin,
          elbow,
          (digit - 1.5) * 0.016,
          dominant ? -0.329 : -0.37,
          dominant ? -0.018 : -0.008,
        );
      }
      return [shoulder, elbow] as const;
    };
    const leg = (side: -1 | 1) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.12, 0.012, 0);
      body.add(hip);
      const short = this.cylinder(
        0.119,
        0.113,
        0.255,
        shorts,
        hip,
        0,
        -0.1,
        0,
        20,
      );
      short.scale.z = 0.94;
      this.box(0.025, 0.2, 0.009, trim, side * 0.098, -0.12, -0.06, hip);
      this.cylinder(0.103, 0.073, 0.265, skin, hip, 0, -0.298, 0, 20);
      this.sphere(0.096, 0.12, 0.088, skin, hip, 0, -0.278, 0.005);
      const knee = new THREE.Group();
      knee.position.y = -0.43;
      hip.add(knee);
      this.sphere(0.075, 0.076, 0.072, skin, knee, 0, 0, -0.01);
      this.cylinder(0.073, 0.047, 0.29, skin, knee, 0, -0.141, 0.008, 20);
      this.sphere(0.073, 0.111, 0.068, skin, knee, 0, -0.115, 0.026);
      this.cylinder(0.054, 0.05, 0.165, socks, knee, 0, -0.301, 0.005, 20);
      const ankle = new THREE.Group();
      ankle.position.set(0, -0.379, 0.003);
      knee.add(ankle);
      this.sphere(0.073, 0.064, 0.14, shoes, ankle, 0, -0.025, -0.046);
      this.box(0.141, 0.023, 0.242, trim, 0, -0.064, -0.045, ankle);
      this.box(0.09, 0.012, 0.085, socks, 0, 0.018, -0.088, ankle);
      for (let j = 0; j < 3; j++)
        this.box(
          0.06,
          0.006,
          0.008,
          this.material(0xaab4b1),
          0,
          0.026,
          -0.068 - j * 0.02,
          ankle,
        );
      return [hip, knee, ankle] as const;
    };
    const [leftArm, leftElbow] = arm(-1),
      [rightArm, rightElbow] = arm(1);
    const [leftLeg, leftKnee, leftAnkle] = leg(-1),
      [rightLeg, rightKnee, rightAnkle] = leg(1);
    const racket = this.makeRacket(profile);
    racket.scale.setScalar(1 / bodyScale);
    racket.position.set(0, -0.305, 0);
    const dominantArm = hand === 1 ? rightArm : leftArm,
      dominantElbow = hand === 1 ? rightElbow : leftElbow;
    dominantElbow.add(racket);
    const shadow = this.makeContactShadow(0.58, 0.66);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.397, 56),
      new THREE.MeshBasicMaterial({
        color: 0xd7fa88,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.036;
    this.scene.add(root, shadow, ring);
    body.position.y = 0.84;
    return {
      root,
      body,
      chest,
      upper,
      head,
      leftArm,
      rightArm,
      leftElbow,
      rightElbow,
      leftLeg,
      rightLeg,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
      dominantArm,
      dominantElbow,
      racket,
      shadow,
      ring,
      gaitPhase: index * 1.7,
      profile,
      bodyScale,
      hand,
      backhand: false,
      contactStamp: -1,
      leftPlant: new THREE.Vector3(),
      rightPlant: new THREE.Vector3(),
      leftPlanted: false,
      rightPlanted: false,
      feetReady: false,
      load: 0,
    };
  }

  private makeRacket(profile: PlayerAppearance) {
    const group = new THREE.Group(),
      shape = new THREE.Shape();
    const round = profile.racket.shape === 'round',
      diamond = profile.racket.shape === 'diamond';
    shape.moveTo(0, 0.112);
    shape.bezierCurveTo(
      -0.056,
      0.118,
      -0.13,
      round ? 0.21 : 0.245,
      -0.126,
      0.295,
    );
    shape.bezierCurveTo(
      diamond ? -0.133 : -0.121,
      0.407,
      diamond ? -0.052 : 0,
      0.422,
      0,
      0.421,
    );
    shape.bezierCurveTo(
      diamond ? 0.052 : 0.121,
      0.422,
      diamond ? 0.133 : 0.126,
      0.407,
      0.126,
      0.295,
    );
    shape.bezierCurveTo(0.13, round ? 0.21 : 0.245, 0.056, 0.118, 0, 0.112);
    for (let row = 0; row < 5; row++)
      for (let col = -2; col <= 2; col++) {
        if ((row === 0 || row === 4) && Math.abs(col) === 2) continue;
        const hole = new THREE.Path();
        hole.absarc(col * 0.04, 0.2 + row * 0.04, 0.009, 0, TAU, false);
        shape.holes.push(hole);
      }
    const carbon = this.textureCanvas(128, (ctx, size) => {
      ctx.fillStyle = profile.racket.color;
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 5)
        for (let x = 0; x < size; x += 5) {
          ctx.fillStyle =
            ((x + y) / 5) % 2 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)';
          ctx.fillRect(x, y, 3, 4);
        }
    });
    const face = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: carbon,
      roughness: 0.47,
      metalness: 0.12,
    });
    const rim = this.material(profile.racket.accent, 0.4, 0.18);
    const racket = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.032,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.004,
        bevelThickness: 0.003,
        curveSegments: 18,
      }),
      [face, rim],
    );
    racket.castShadow = true;
    group.add(racket);
    const gripMaterial = this.material(0xd8dfd8, 0.93);
    this.cylinder(0.018, 0.02, 0.112, gripMaterial, group, 0, 0.053, 0.014, 16);
    const gripLine = this.material(0xa2afa7, 0.92);
    for (let y = 0.008; y < 0.109; y += 0.014)
      this.cylinder(0.0205, 0.0205, 0.0025, gripLine, group, 0, y, 0.014, 12);
    const logo = this.playerLabel(
      profile.racket.brand,
      0.14,
      0.039,
      profile.racket.accent,
    );
    logo.position.set(0, 0.298, -0.005);
    logo.rotation.y = Math.PI;
    group.add(logo);
    const logoBack = logo.clone();
    logoBack.position.z = 0.039;
    logoBack.rotation.y = 0;
    group.add(logoBack);
    const throat = new THREE.Path();
    throat.moveTo(-0.025, 0.12);
    throat.lineTo(0, 0.159);
    throat.lineTo(0.025, 0.12);
    throat.closePath();
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.03, 0.003, 5, 18, Math.PI * 1.8),
      this.material(0x253b3e),
    );
    strap.scale.x = 0.65;
    strap.position.set(0.016, -0.015, 0.012);
    group.add(strap);
    group.rotation.x = Math.PI;
    return group;
  }

  setPlayers(profiles: PlayerAppearance[]) {
    const defaults = matchAppearances(0, 1);
    const next = Array.from(
      { length: 4 },
      (_, i) => profiles[i] ?? defaults[i],
    );
    if (
      this.rigs.length === 4 &&
      next.every((profile, i) => this.rigs[i].profile.id === profile.id)
    )
      return;
    for (const rig of this.rigs) {
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      for (const object of [rig.root, rig.shadow, rig.ring]) {
        object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) geometries.add(mesh.geometry);
          if (mesh.material)
            (Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material]
            ).forEach((material) => materials.add(material));
        });
        this.scene.remove(object);
      }
      for (const material of materials) {
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) textures.add(value);
        material.dispose();
      }
      geometries.forEach((geometry) => geometry.dispose());
      textures.forEach((texture) => texture.dispose());
      this.textures = this.textures.filter((texture) => !textures.has(texture));
    }
    this.rigs = next.map((profile, index) => this.makePlayer(index, profile));
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
    this.hemisphere.intensity = day ? 2.1 : 1.4;
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

  setChargePreview(preview: ChargePreview) {
    this.charge = {
      active: preview.active,
      progress: clamp(preview.progress, 0, 1),
      aim: clamp(preview.aim, -1, 1),
      smash: preview.smash,
    };
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
    const tactical = state as TacticalView;
    const contact = tactical.contactPoint;
    if (
      time < this.lastSceneTime ||
      (state.phase === 'serve' && this.lastPhase !== 'serve')
    ) {
      this.trailHistory.length = 0;
      this.lastBounceKey = '';
      for (const pulse of this.impactPulses) pulse.started = -10;
      for (const rig of this.rigs) rig.feetReady = false;
    }
    this.lastSceneTime = time;
    this.lastPhase = state.phase;
    if (state.phase !== 'rally') this.trailHistory.length = 0;
    for (let i = 0; i < this.rigs.length; i++) {
      const player = state.players[i];
      if (!player) continue;
      const rig = this.rigs[i];
      const hitArm = rig.dominantArm,
        hitElbow = rig.dominantElbow;
      const offArm = rig.hand === 1 ? rig.leftArm : rig.rightArm;
      const offElbow = rig.hand === 1 ? rig.leftElbow : rig.rightElbow;
      const action = player as typeof player & {
        preparation?: number;
        movementIntent?: string;
        reachAcross?: boolean;
        outside?: boolean;
        charging?: boolean;
        charge?: number;
      };
      const previewing = i === state.controlled && this.charge.active;
      const isCharging = previewing || !!action.charging;
      const chargeAmount = previewing
        ? this.charge.progress
        : (action.charge ?? 0);
      const shot =
        previewing && this.charge.smash ? 'remate' : String(player.shot);
      const age = contact?.playerId === player.id ? time - contact.time : 100;
      const hasContact = age >= 0 && age < 0.58;
      const contactShot = hasContact ? contact!.shot : shot;
      if (hasContact && rig.contactStamp !== contact!.time) {
        rig.contactStamp = contact!.time;
        rig.backhand =
          (contact!.x - player.x) * (player.team === 0 ? 1 : -1) * rig.hand <
          -0.1;
      } else if (!hasContact && player.preparation > 0.1) {
        rig.backhand =
          (state.ball.x - player.x) * (player.team === 0 ? 1 : -1) * rig.hand <
          -0.16;
      }
      const overhead = ['remate', 'bandeja', 'vibora', 'bajada'].includes(
        contactShot,
      );
      const smash = contactShot === 'remate';
      const defendingWall =
        action.movementIntent === 'giro' || action.movementIntent === 'pared';
      const speed = Math.hypot(player.vx || 0, player.vz || 0);
      const stride = Math.min(speed / 4.0, 1);
      // The phase integrates displacement: changing speed does not pop the feet between poses.
      rig.gaitPhase +=
        dt * (speed > 0.1 ? 7.0 + speed * (defendingWall ? 2.0 : 1.45) : 1.5);
      const step = Math.sin(rig.gaitPhase) * stride;
      const bounce = Math.abs(Math.cos(rig.gaitPhase)) * 0.026 * stride;
      const swing = clamp(player.swing || 0, 0, 1);
      const follow = hasContact ? clamp(age / 0.44, 0, 1) : 1 - swing;
      const ballDistance = Math.hypot(
        state.ball.x - player.x,
        state.ball.z - player.z,
      );
      const incoming = player.team === state.incomingTeam;
      const preparation = clamp(
        Math.max(
          action.preparation ?? 0,
          isCharging ? 0.45 + chargeAmount * 0.55 : 0,
          incoming && state.ball.vy < 1 && ballDistance < 2.8
            ? 1 - ballDistance / 3.2
            : 0,
        ),
        0,
        1,
      );
      const highPreparation =
        preparation *
        ((state.ball.y > 1.8 || (previewing && this.charge.smash)) &&
        (preparation > 0.42 || previewing)
          ? 1
          : 0);
      const loadingSmash = previewing
        ? this.charge.smash
        : state.ball.y > (player.height ?? rig.profile.height) + 0.5;
      rig.load = THREE.MathUtils.lerp(
        rig.load,
        hasContact ? 0 : highPreparation,
        Math.min(1, dt * 14),
      );
      const lowContact = hasContact
        ? clamp((0.95 - contact!.y) / 2.3, 0, 0.32)
        : 0;
      const crouch = Math.max(
        lowContact,
        !hasContact ? rig.load * (loadingSmash ? 0.16 : 0.095) : 0,
        !hasContact && highPreparation > 0.12 ? (loadingSmash ? 0.14 : 0.1) : 0,
        defendingWall
          ? 0.09
          : (state.phase === 'rally' ? 0.055 : 0.025) + preparation * 0.025,
      );
      const contactFade = hasContact
        ? 1 - THREE.MathUtils.smoothstep(age, 0.1, 0.42)
        : 0;
      const lunge = hasContact
        ? clamp(
            Math.hypot(contact!.x - player.x, contact!.z - player.z) - 0.8,
            0,
            0.42,
          ) * contactFade
        : 0;
      this.contactDirection
        .set(
          hasContact ? contact!.x - player.x : 0,
          0,
          hasContact ? contact!.z - player.z : 0,
        )
        .normalize();
      rig.root.position.set(player.x, 0, player.z);
      const defaultFacing = player.team === 0 ? 0 : Math.PI;
      const overheadStance =
        (!hasContact && highPreparation > 0.12) || (hasContact && overhead);
      const facing = overheadStance
        ? action.outside
          ? Math.atan2(player.x, player.z)
          : defaultFacing
        : Number.isFinite(player.facing)
          ? player.facing
          : defaultFacing;
      let delta = ((facing - rig.root.rotation.y + Math.PI) % TAU) - Math.PI;
      if (delta < -Math.PI) delta += TAU;
      rig.root.rotation.y +=
        delta * Math.min(1, dt * (defendingWall ? 15 : 12));
      // High smash: load, jump at contact, land on bent knees, recover toward the pair.
      const jumpHeight =
        hasContact && overhead
          ? clamp(
              contact!.y / rig.bodyScale - (smash ? 2.17 : 2.27),
              smash ? 0.06 : 0,
              0.66 / rig.bodyScale,
            ) * Math.max(0, 1 - (age / 0.32) ** 2)
          : 0;
      const landingLoad =
        hasContact && smash
          ? Math.sin(clamp((age - 0.25) / 0.17, 0, 1) * Math.PI) * 0.09
          : 0;
      const lean = this.contactDirection
        .clone()
        .multiplyScalar(Math.min(lunge, 0.23));
      const atDoor =
        Math.abs(player.z) > COURT.doorMinZ + 0.12 &&
        Math.abs(player.z) < COURT.doorMaxZ - 0.12;
      if (!action.outside && !atDoor)
        lean.x = clamp(player.x + lean.x, -4.76, 4.76) - player.x;
      if (!action.outside)
        lean.z =
          clamp(
            player.z + lean.z,
            player.team === 0 ? 0.24 : -9.76,
            player.team === 0 ? 9.76 : -0.24,
          ) - player.z;
      lean
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -rig.root.rotation.y)
        .divideScalar(rig.bodyScale);
      rig.body.position.set(
        lean.x,
        0.9 + bounce + jumpHeight - crouch - landingLoad,
        lean.z + (hasContact && smash ? -0.11 * Math.sin(follow * Math.PI) : 0),
      );
      rig.body.rotation.set(
        -stride * 0.05 - 0.015 - crouch * 0.4,
        hasContact
          ? Math.sin(follow * Math.PI) * (overhead ? -0.42 : -0.25)
          : highPreparation * -0.15,
        -step * 0.025,
      );
      const coil =
        rig.hand *
        (rig.backhand ? -0.68 : highPreparation > 0.12 ? 0.68 : 0.48);
      rig.chest.rotation.set(
        0,
        hasContact
          ? THREE.MathUtils.lerp(coil * 0.5, -coil * 0.9, follow) *
              (1 - THREE.MathUtils.smoothstep(age, 0.29, 0.44))
          : coil * preparation,
        0,
      );
      rig.body.rotation.y = hasContact
        ? rig.hand *
          (rig.backhand ? -0.42 : 0.42) *
          (1 - THREE.MathUtils.smoothstep(age, 0, 0.24))
        : rig.hand *
          (rig.backhand ? -0.6 : 0.75) *
          preparation *
          (highPreparation > 0 ? 1 : 0.6);
      if (!hasContact && highPreparation > 0.12) {
        // The non-dominant shoulder faces the net, independent of the chase-facing angle.
        rig.body.rotation.y = -rig.hand * 0.68;
        rig.chest.rotation.y = -rig.hand * 0.64;
      } else if (hasContact && overhead) {
        const release = THREE.MathUtils.smoothstep(age, 0, 0.28);
        const recover = 1 - THREE.MathUtils.smoothstep(age, 0.42, 0.58);
        rig.body.rotation.y =
          rig.hand * THREE.MathUtils.lerp(-0.25, 0.35, release) * recover;
        rig.chest.rotation.y =
          rig.hand * THREE.MathUtils.lerp(-0.3, 0.55, follow) * recover;
      }
      const shortStep = defendingWall ? 0.68 : 1;
      rig.leftLeg.rotation.set(
        step * 0.6 * shortStep + 0.07 + crouch * 3.0,
        0,
        -0.04 - stride * 0.04,
      );
      rig.rightLeg.rotation.set(
        -step * 0.6 * shortStep + 0.07 + crouch * 3.0,
        0,
        0.04 + stride * 0.04,
      );
      rig.leftKnee.rotation.x = -Math.max(0, -step) * 0.83 - 0.1 - crouch * 6.0;
      rig.rightKnee.rotation.x = -Math.max(0, step) * 0.83 - 0.1 - crouch * 6.0;
      rig.leftAnkle.rotation.x =
        -(rig.leftLeg.rotation.x + rig.leftKnee.rotation.x) * 0.73;
      rig.rightAnkle.rotation.x =
        -(rig.rightLeg.rotation.x + rig.rightKnee.rotation.x) * 0.73;
      if (hasContact && overhead) {
        rig.body.rotation.x += 0.1 * (1 - follow) - 0.19 * follow;
        rig.leftLeg.rotation.x += 0.16 * contactFade;
        rig.rightLeg.rotation.x -= 0.1 * contactFade;
        rig.leftKnee.rotation.x -= jumpHeight * 0.6 + landingLoad * 3;
        rig.rightKnee.rotation.x -= jumpHeight * 1.1 + landingLoad * 3;
      }
      // Both hands are forward in a compact ready stance; net play uses a shorter swing.
      offArm.rotation.set(0.28 - step * 0.27 + preparation * 0.22, 0, -0.16);
      hitArm.rotation.set(0.38 + step * 0.23 + preparation * 0.32, -0.1, 0.2);
      offElbow.rotation.set(0.55 + preparation * 0.25, 0, 0);
      hitElbow.rotation.set(0.6 + preparation * 0.15, 0, 0);
      rig.racket.rotation.set(Math.PI + 0.12, -0.1, -0.12);
      rig.head.rotation.x = clamp((state.ball.y - 1.8) * 0.055, -0.15, 0.3);
      if (highPreparation > 0.05 && !hasContact) {
        hitArm.rotation.x = 0.6 + highPreparation * 1.6;
        hitArm.rotation.z = 0.25 + highPreparation * 0.25;
        hitElbow.rotation.x = 0.8;
        offArm.rotation.x = highPreparation * 1.5;
        offArm.rotation.z = -0.28;
        rig.body.rotation.x += highPreparation * 0.1;
      }
      if (swing > 0.01 || hasContact) {
        const accent = Math.sin(follow * Math.PI);
        if (overhead) {
          hitArm.rotation.x = 2.6 - follow * 2.0;
          hitArm.rotation.z =
            contactShot === 'vibora'
              ? 0.87
              : contactShot === 'bandeja'
                ? 0.62
                : 0.32;
          hitElbow.rotation.x = 0.5 - accent * 0.4;
          offArm.rotation.x = 1.45 * (1 - follow);
          offArm.rotation.z = -0.4;
          rig.racket.rotation.x = Math.PI - 0.2;
          if (contactShot === 'bandeja') {
            hitArm.rotation.x = 1.95 - follow * 1.12;
            hitArm.rotation.y = -0.35 + follow * 1.6;
            hitElbow.rotation.x = 0.64;
          } else if (contactShot === 'vibora') {
            hitArm.rotation.x = 2.18 - follow * 1.12;
            hitArm.rotation.y = -0.68 + follow * 1.8;
            hitElbow.rotation.x = 0.9 * (1 - follow) + 0.2;
          }
        } else if (contactShot === 'globo' || contactShot === 'contrapared') {
          hitArm.rotation.x = 0.1 + accent * 1.0;
          hitArm.rotation.z = 0.3;
          hitElbow.rotation.x = 0.15 + accent * 0.3;
        } else if (['dejada', 'chiquita', 'volea'].includes(contactShot)) {
          hitArm.rotation.x = 0.65 + accent * 0.28;
          hitArm.rotation.z = 0.22;
          hitElbow.rotation.x = 0.35;
          offArm.rotation.x = 0.65;
          rig.body.rotation.x -= contactShot === 'chiquita' ? 0.12 : 0.04;
        } else {
          hitArm.rotation.x = 0.4 + accent * 0.65;
          hitArm.rotation.y = -0.75 + follow * 1.1;
          hitArm.rotation.z = 0.42;
          hitElbow.rotation.x = 0.36;
          offArm.rotation.z = -0.4;
        }
      }
      const serving =
        i === state.server &&
        (state.phase === 'serve' || (state.rally === 1 && swing > 0.05));
      if (serving) {
        const progress =
          state.phase === 'serve' ? state.serviceMotion : 1 + (1 - swing) * 0.5;
        rig.body.rotation.x = -0.08;
        offArm.rotation.x = progress < 0.55 ? 0.68 : 0.22;
        offElbow.rotation.x = 0.23;
        hitArm.rotation.x = -0.38 + clamp((progress - 0.55) / 0.7, 0, 1);
        hitArm.rotation.y = -0.12;
        hitArm.rotation.z = 0.25;
        hitElbow.rotation.x = 0.1;
        rig.racket.rotation.set(Math.PI + 0.2, 0, -0.2);
      }
      hitArm.rotation.z *= rig.hand;
      hitArm.rotation.y *= rig.hand;
      offArm.rotation.z *= rig.hand;
      if (rig.backhand && !overhead && !serving) {
        hitArm.rotation.y = rig.hand * (0.8 - follow * 1.1);
        offArm.rotation.x = 0.78;
        offElbow.rotation.x = 0.85;
      }
      if (!hasContact && highPreparation > 0.12 && !serving) {
        this.prepareOverhead(rig, 1, loadingSmash);
      } else if (!hasContact && preparation > 0.3 && !serving) {
        this.prepareGround(rig, Math.abs(player.z) < 4, state.ball.y < 0.85);
      }
      if (hasContact && smash) {
        // Free hand folds toward the sternum as the dominant side extends.
        this.poseArm(
          rig,
          false,
          new THREE.Vector3(-rig.hand * 0.28, 0.5, -0.09),
          new THREE.Vector3(-rig.hand * 0.1, 0.37, -0.18),
          clamp(age / 0.07, 0, 1),
        );
        rig.body.rotation.x += -0.12 * Math.sin(follow * Math.PI);
      }
      // The procedural stroke is only the preparation/recovery pose. At impact the
      // articulated arm is solved toward the physics contact, never the reverse.
      if (hasContact) {
        this.armTarget.set(contact!.x, contact!.y, contact!.z);
        const outgoing = this.armDirection
          .set(state.ball.vx, 0, state.ball.vz)
          .normalize();
        const travel = THREE.MathUtils.smoothstep(age, 0.035, 0.3);
        this.armTarget.addScaledVector(
          outgoing,
          travel * (overhead ? 0.22 : 0.15),
        );
        this.armTarget.y +=
          travel * (overhead ? -0.38 : contactShot === 'globo' ? 0.2 : 0.025);
        if (
          ['bandeja', 'vibora', 'remate'].includes(contactShot) ||
          rig.backhand
        ) {
          const across =
            contactShot === 'remate'
              ? -0.32
              : rig.backhand && !overhead
                ? 0.36
                : -0.42;
          const endingHeight =
            contactShot === 'remate'
              ? 0.73
              : contactShot === 'bandeja'
                ? 1.37
                : 1.28;
          rig.root.updateMatrixWorld(true);
          const finish = rig.root.localToWorld(
            new THREE.Vector3(rig.hand * across, endingHeight, -0.3),
          );
          this.armTarget.lerp(
            finish,
            THREE.MathUtils.smoothstep(age, 0.025, 0.31),
          );
        }
        const ikWeight = 1 - THREE.MathUtils.smoothstep(age, 0.42, 0.57);
        this.anchorRacket(rig, this.armTarget, ikWeight, outgoing);
        // Forearm pronation appears after contact; it cannot rotate the ball trajectory.
        if (smash)
          rig.racket.rotateY(
            rig.hand * Math.sin(clamp(age / 0.26, 0, 1) * Math.PI) * 0.5,
          );
      } else if (highPreparation > 0.12 && !serving) {
        // Preserve the loaded overhead pose even when the lob is still above reach.
        // The neutral-ready IK must not pull this racket back down to the waist.
      } else if (
        preparation > 0.15 &&
        !serving &&
        ballDistance < 1.15 &&
        state.ball.y < 3.2
      ) {
        this.armTarget.set(
          state.ball.x,
          clamp(state.ball.y, 0.4, 2.65),
          state.ball.z,
        );
        this.anchorRacket(rig, this.armTarget, preparation * 0.65);
      } else if (preparation > 0.3 && !serving) {
        // Keep the compact prepared groundstroke until the ball enters contact range.
      } else if (!serving && swing < 0.01) {
        rig.root.updateMatrixWorld(true);
        this.armTarget.set(
          rig.hand * 0.045,
          state.phase === 'rally' ? 1.3 : 1.18,
          -0.4,
        );
        rig.root.localToWorld(this.armTarget);
        this.anchorRacket(rig, this.armTarget, 0.96);
        offArm.rotation.x = 0.83;
        offArm.rotation.z = -rig.hand * 0.12;
        offElbow.rotation.x = 1.15;
      }
      this.stabilizeFeet(rig, player.vx, player.vz, jumpHeight);
      if (
        speed < 2.2 &&
        ((highPreparation > 0.12 && !hasContact) || hasContact)
      ) {
        this.strokeFootwork(
          rig,
          !hasContact ? highPreparation : 0,
          hasContact ? age : -1,
          smash || loadingSmash,
          jumpHeight,
        );
      }
      this.lookDirection.set(
        state.ball.x - player.x,
        0,
        state.ball.z - player.z,
      );
      const targetHeadAngle =
        Math.atan2(-this.lookDirection.x, -this.lookDirection.z) -
        rig.root.rotation.y;
      rig.head.rotation.y = Math.sin(targetHeadAngle) * 0.48;
      rig.shadow.position.set(rig.root.position.x, 0.033, rig.root.position.z);
      rig.shadow.scale.set(1 + jumpHeight * 0.4, 1.05 + jumpHeight * 0.5, 1);
      (rig.shadow.material as THREE.MeshBasicMaterial).opacity =
        0.64 - jumpHeight * 0.3;
      rig.ring.visible = i === state.controlled;
      rig.ring.position.set(rig.root.position.x, 0.037, rig.root.position.z);
      (rig.ring.material as THREE.MeshBasicMaterial).opacity =
        0.7 + Math.sin(time * 3) * 0.1;
    }
    const ball = state.ball;
    this.ball.position.set(ball.x, Math.max(BALL_RADIUS, ball.y), ball.z);
    const angular = ball as typeof ball & {
      wx?: number;
      wy?: number;
      wz?: number;
    };
    this.ball.rotation.x += dt * (angular.wx ?? (ball.vz || 0) * 2);
    this.ball.rotation.y += dt * (angular.wy ?? 0);
    this.ball.rotation.z += dt * (angular.wz ?? -(ball.vx || 0) * 2);
    this.ballShadow.position.set(ball.x, 0.036, ball.z);
    const shadowSize = 1 + Math.min(ball.y, 12) * 0.1;
    this.ballShadow.scale.setScalar(shadowSize);
    (this.ballShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(
      0.18,
      0.69 - ball.y * 0.043,
    );
    this.updateImpacts(tactical, time);
    const airborne = state.phase === 'rally' && ball.y > 1.4;
    this.landing.visible = airborne;
    if (airborne) {
      const flight =
        (ball.vy + Math.sqrt(ball.vy ** 2 + 2 * 9.81 * Math.max(0, ball.y))) /
        9.81;
      const lx = ball.x + ball.vx * flight,
        lz = ball.z + ball.vz * flight;
      this.landing.visible = Math.abs(lx) < 5 && Math.abs(lz) < 10;
      this.landing.position.set(lx, 0.027, lz);
      this.landing.scale.setScalar(1 + 0.09 * Math.sin(time * 7));
    }
    this.trailHistory.unshift(this.ball.position.clone());
    if (this.trailHistory.length > 20) this.trailHistory.pop();
    const trailArray = this.trail.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 0; i < 20; i++) {
      const p = this.trailHistory[Math.min(i, this.trailHistory.length - 1)];
      trailArray.setXYZ(i, p.x, p.y, p.z);
    }
    trailArray.needsUpdate = true;
    // This line contains observed positions only, including the real reversal at glass.
    this.trail.visible =
      state.phase === 'rally' && Math.hypot(ball.vx, ball.vy, ball.vz) > 8;
    (this.trail.material as THREE.LineBasicMaterial).opacity =
      tactical.lastBounce?.surface === 'vidrio' &&
      time - tactical.lastBounce.time < 0.7
        ? 0.48
        : 0.31;
    const outsidePlayers = state.players.filter(
      (p) => (p as typeof p & { outside?: boolean }).outside,
    );
    const outsideX = outsidePlayers.length
      ? outsidePlayers[0].x
      : Math.abs(ball.x) > 5.1
        ? clamp(ball.x, -8.5, 8.5)
        : 0;
    this.exteriorFocus = THREE.MathUtils.lerp(
      this.exteriorFocus,
      outsideX,
      Math.min(1, dt * 4),
    );
    this.updateCamera(ball.x, ball.z, dt);
    this.updatePresentation(state, tactical, time);
    this.renderer.render(this.scene, this.camera);
  }

  private poseArm(
    rig: Rig,
    dominant: boolean,
    elbowTarget: THREE.Vector3,
    wristTarget: THREE.Vector3,
    weight = 1,
  ) {
    const arm = dominant
      ? rig.dominantArm
      : rig.hand === 1
        ? rig.leftArm
        : rig.rightArm;
    const forearm = dominant
      ? rig.dominantElbow
      : rig.hand === 1
        ? rig.leftElbow
        : rig.rightElbow;
    const down = new THREE.Vector3(0, -1, 0);
    const upperAxis = elbowTarget.clone().sub(arm.position).normalize();
    const upperQ = new THREE.Quaternion().setFromUnitVectors(down, upperAxis);
    const actualElbow = arm.position.clone().addScaledVector(upperAxis, 0.32);
    const lowerAxis = wristTarget
      .clone()
      .sub(actualElbow)
      .normalize()
      .applyQuaternion(upperQ.clone().invert());
    arm.quaternion.slerp(upperQ, weight);
    forearm.quaternion.slerp(
      new THREE.Quaternion().setFromUnitVectors(down, lowerAxis),
      weight,
    );
  }

  private prepareOverhead(rig: Rig, weight: number, smash: boolean) {
    // Landmarks from the supplied four-frame sequence: loaded elbow behind the shoulder,
    // forearm flexed, off hand pointing upward, racket drop behind the head for a smash.
    this.poseArm(
      rig,
      true,
      new THREE.Vector3(rig.hand * 0.48, 0.87, 0.15),
      new THREE.Vector3(rig.hand * 0.27, 1.08, 0.14),
      weight,
    );
    this.poseArm(
      rig,
      false,
      new THREE.Vector3(-rig.hand * 0.3, 0.98, -0.17),
      new THREE.Vector3(-rig.hand * 0.35, 1.3, -0.29),
      weight,
    );
    const yAxis = new THREE.Vector3(
      rig.hand * 0.1,
      smash ? -0.8 : 0.91,
      smash ? 0.59 : 0.39,
    ).normalize();
    const normal = new THREE.Vector3(0, 0, -1)
      .addScaledVector(yAxis, yAxis.z)
      .normalize();
    const xAxis = new THREE.Vector3().crossVectors(yAxis, normal).normalize();
    normal.crossVectors(xAxis, yAxis).normalize();
    const desired = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(xAxis, yAxis, normal),
    );
    const chain = rig.dominantArm.quaternion
      .clone()
      .multiply(rig.dominantElbow.quaternion)
      .invert();
    rig.racket.quaternion.slerp(chain.multiply(desired), weight);
  }

  private prepareGround(rig: Rig, volley: boolean, low: boolean) {
    // Compact padel preparation: the elbow stays close and the free hand balances the turn.
    const across = rig.backhand ? -1 : 1;
    this.poseArm(
      rig,
      true,
      new THREE.Vector3(
        rig.hand * (rig.backhand ? 0.05 : 0.4),
        low ? 0.3 : volley ? 0.48 : 0.42,
        volley ? -0.16 : 0.1,
      ),
      new THREE.Vector3(
        rig.hand * across * (volley ? 0.24 : 0.36),
        low ? 0.06 : volley ? 0.42 : 0.24,
        volley ? -0.38 : -0.03,
      ),
      1,
    );
    this.poseArm(
      rig,
      false,
      new THREE.Vector3(-rig.hand * 0.32, 0.47, -0.1),
      new THREE.Vector3(-rig.hand * (rig.backhand ? 0.15 : 0.36), 0.42, -0.35),
      0.85,
    );
    rig.racket.rotation.set(
      Math.PI + (low ? 0.42 : 0),
      rig.hand * 0.16,
      -rig.hand * 0.14,
    );
  }

  private strokeFootwork(
    rig: Rig,
    load: number,
    age: number,
    smash: boolean,
    jump: number,
  ) {
    if (jump > 0.035) {
      const scissor = THREE.MathUtils.smoothstep(age, 0.06, 0.28);
      const dominantLeg = rig.hand === 1 ? rig.rightLeg : rig.leftLeg;
      const otherLeg = rig.hand === 1 ? rig.leftLeg : rig.rightLeg;
      const dominantKnee = rig.hand === 1 ? rig.rightKnee : rig.leftKnee;
      dominantLeg.rotation.x = THREE.MathUtils.lerp(0.24, -0.55, scissor);
      otherLeg.rotation.x = THREE.MathUtils.lerp(-0.16, 0.24, scissor);
      dominantKnee.rotation.x = -0.22 - scissor * 0.62;
      return;
    }
    const recovery = age < 0 ? 0 : THREE.MathUtils.smoothstep(age, 0.27, 0.52);
    const stance =
      age < 0 ? load : 1 - THREE.MathUtils.smoothstep(age, 0.44, 0.62);
    rig.root.updateMatrixWorld(true);
    for (const side of [-1, 1]) {
      const dominant = side === rig.hand;
      const rear = smash ? dominant : dominant !== rig.backhand;
      const z = rear
        ? THREE.MathUtils.lerp(0.3, smash ? -0.33 : 0.02, recovery)
        : THREE.MathUtils.lerp(-0.3, 0.13, recovery);
      const target = rig.root.localToWorld(
        new THREE.Vector3(side * (0.185 + 0.085 * stance), 0.08, z * stance),
      );
      this.solveLeg(rig, side, target);
      if (age >= 0 && dominant && recovery > 0.1 && recovery < 0.88) {
        const ankle = side < 0 ? rig.leftAnkle : rig.rightAnkle;
        ankle.rotation.x -= Math.sin(recovery * Math.PI) * 0.16;
      }
    }
    rig.feetReady = false;
  }

  private updatePresentation(
    state: GameState,
    tactical: TacticalView,
    time: number,
  ) {
    const player = state.players[state.controlled];
    const active =
      this.charge.active &&
      !!player &&
      state.phase !== 'finished' &&
      state.phase !== 'point';
    this.aimArrow.visible = this.aimTarget.visible = active;
    if (active) {
      const target = new THREE.Vector3(
        this.charge.aim * 4.35,
        0.043,
        player.team === 0 ? -5.4 : 5.4,
      );
      if (this.charge.smash && state.smashMode === 'por3') {
        target.x = (Math.sign(this.charge.aim) || 1) * 5.4;
        target.z = player.team === 0 ? -3.4 : 3.4;
      }
      const origin = new THREE.Vector3(player.x, 0.043, player.z);
      const direction = target.clone().sub(origin),
        length = direction.length();
      this.aimArrow.position.copy(origin);
      this.aimArrow.setDirection(direction.normalize());
      this.aimArrow.setLength(length, 0.43, 0.24);
      const color =
        this.charge.progress > 0.7 && this.charge.progress < 0.94
          ? 0xffd86f
          : 0xd2ef8c;
      this.aimArrow.setColor(color);
      this.aimTarget.material.color.setHex(color);
      this.aimTarget.position.copy(target);
      this.aimTarget.scale.setScalar(0.85 + this.charge.progress * 0.35);
    }
    const contact = tactical.contactPoint;
    if (time < this.perfectAt) {
      this.perfectAt = -100;
      this.perfectKey = '';
    }
    if (contact?.quality === 'perfect' && time - contact.time < 0.15) {
      const key = `${contact.playerId}:${contact.time}`;
      if (key !== this.perfectKey) {
        this.perfectKey = key;
        this.perfectAt = contact.time;
        this.perfectLight.position.set(contact.x, contact.y, contact.z);
        for (const ring of this.perfectRings)
          ring.position.copy(this.perfectLight.position);
      }
    }
    const age = time - this.perfectAt;
    for (let i = 0; i < this.perfectRings.length; i++) {
      const ring = this.perfectRings[i],
        phase = (age - i * 0.045) / 0.28;
      ring.visible = phase >= 0 && phase < 1;
      if (ring.visible) {
        ring.quaternion.copy(this.camera.quaternion);
        ring.scale.setScalar(1 + phase * 4);
        ring.material.opacity = (1 - phase) * 0.8;
      }
    }
    this.perfectLight.intensity =
      age >= 0 && age < 0.22 ? 1.5 * (1 - age / 0.22) : 0;
    const glow = age >= 0 && age < 0.6;
    (this.trail.material as THREE.LineBasicMaterial).color.setHex(
      glow ? 0xffd978 : 0xe2fc9c,
    );
    if (glow) (this.trail.material as THREE.LineBasicMaterial).opacity = 0.65;
    if (age >= 0 && age < 0.16) {
      this.camera.position.x += Math.sin(age * 95) * 0.024 * (1 - age / 0.16);
      this.camera.position.y += Math.sin(age * 65) * 0.02 * (1 - age / 0.16);
      this.camera.updateMatrixWorld(true);
    }
  }

  private updateBallScale(camera: THREE.Camera) {
    const depth = -this.ballViewPosition
      .copy(this.ball.position)
      .applyMatrix4(camera.matrixWorldInverse).z;
    const viewportHeight = this.renderer.getSize(this.viewportSize).y;
    const projectedDiameter =
      (BALL_RADIUS * viewportHeight * camera.projectionMatrix.elements[5]) /
      Math.max(0.1, depth);
    const scale =
      this.cameraMode === 'cerca'
        ? 1
        : clamp(2.8 / Math.max(projectedDiameter, 0.01), 1, 1.8);
    this.ball.scale.setScalar(scale);
    // onBeforeRender runs after the scene matrix pass; refresh this mesh and its seam.
    this.ball.updateMatrixWorld(true);
  }

  private anchorRacket(
    rig: Rig,
    worldTarget: THREE.Vector3,
    weight: number,
    faceToward?: THREE.Vector3,
  ) {
    if (weight <= 0) return;
    rig.root.updateMatrixWorld(true);
    const target = rig.upper.worldToLocal(worldTarget.clone());
    const shoulder = rig.dominantArm.position;
    const line = target.clone().sub(shoulder);
    if (line.lengthSq() < 0.000001) return;
    const upperLength = 0.32,
      forearmLength = 0.305,
      racketLength = 0.285 / rig.bodyScale;
    const radial = line.clone().normalize();
    const distance = Math.min(
      line.length(),
      upperLength + forearmLength + racketLength - 0.002,
    );
    const actualTarget = shoulder.clone().addScaledVector(radial, distance);
    // The wrist can cock independently: the face is upright in ready/volley poses,
    // and opens downwards for a low pickup. This removes the old edge-on stick pose.
    const preferred = new THREE.Vector3(
      rig.hand * 0.12,
      target.y < 0.32 ? -0.88 : 1,
      -0.08,
    ).normalize();
    const cosineLimit = clamp(
      (distance * distance + racketLength * racketLength - 0.622 ** 2) /
        (2 * distance * racketLength),
      -1,
      1,
    );
    const maxAngle = Math.acos(cosineLimit);
    const requestedAngle = Math.acos(clamp(radial.dot(preferred), -1, 1));
    const angle = Math.min(requestedAngle, maxAngle * 0.96);
    const side = preferred
      .clone()
      .addScaledVector(radial, -preferred.dot(radial));
    if (side.lengthSq() < 0.0001)
      side.set(rig.hand, 0, 0).addScaledVector(radial, -radial.x * rig.hand);
    side.normalize();
    const racketAxis = radial
      .clone()
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(side, Math.sin(angle))
      .normalize();
    const wrist = actualTarget
      .clone()
      .addScaledVector(racketAxis, -racketLength);
    const wristLine = wrist.clone().sub(shoulder);
    const armDistance = clamp(
      wristLine.length(),
      0.022,
      upperLength + forearmLength - 0.0005,
    );
    const armAxis = wristLine.normalize();
    const pole = new THREE.Vector3(
      rig.hand * (rig.backhand ? 0.3 : 1),
      -0.18,
      0.33,
    );
    const bend = pole.addScaledVector(armAxis, -pole.dot(armAxis)).normalize();
    if (bend.lengthSq() < 0.001)
      bend.set(0, 0, 1).addScaledVector(armAxis, -armAxis.z).normalize();
    const cosine = clamp(
      (upperLength ** 2 + armDistance ** 2 - forearmLength ** 2) /
        (2 * upperLength * armDistance),
      -1,
      1,
    );
    const elbow = shoulder
      .clone()
      .addScaledVector(armAxis, cosine * upperLength)
      .addScaledVector(bend, Math.sqrt(1 - cosine ** 2) * upperLength);
    const down = new THREE.Vector3(0, -1, 0);
    const upperRotation = new THREE.Quaternion().setFromUnitVectors(
      down,
      elbow.clone().sub(shoulder).normalize(),
    );
    const lowerRotation = new THREE.Quaternion().setFromUnitVectors(
      down,
      wrist
        .clone()
        .sub(elbow)
        .normalize()
        .applyQuaternion(upperRotation.clone().invert()),
    );
    rig.dominantArm.quaternion.slerp(upperRotation, weight);
    rig.dominantElbow.quaternion.slerp(lowerRotation, weight);
    const chainInverse = upperRotation.clone().multiply(lowerRotation).invert();
    const yAxis = racketAxis.clone().applyQuaternion(chainInverse).normalize();
    const normal = new THREE.Vector3(0, 0, -1);
    if (faceToward && faceToward.lengthSq() > 0.001) {
      const upperWorld = rig.upper.getWorldQuaternion(new THREE.Quaternion());
      normal.copy(faceToward).applyQuaternion(upperWorld.invert());
    }
    normal
      .applyQuaternion(chainInverse)
      .addScaledVector(yAxis, -normal.dot(yAxis));
    if (normal.lengthSq() < 0.002)
      normal.set(0, 0, 1).addScaledVector(yAxis, -yAxis.z);
    normal.normalize();
    const xAxis = new THREE.Vector3().crossVectors(yAxis, normal).normalize();
    normal.crossVectors(xAxis, yAxis).normalize();
    const orientation = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(xAxis, yAxis, normal),
    );
    rig.racket.quaternion.slerp(orientation, weight);
  }

  private stabilizeFeet(rig: Rig, vx: number, vz: number, jump: number) {
    if (jump > 0.035) {
      rig.feetReady = false;
      return;
    }
    rig.root.updateMatrixWorld(true);
    const speed = Math.hypot(vx, vz);
    const heading = new THREE.Vector3(vx, 0, vz);
    if (speed > 0.1) heading.normalize();
    const pelvisWorld = rig.body.getWorldPosition(new THREE.Vector3());
    const phases = [rig.gaitPhase, rig.gaitPhase + Math.PI];
    const plants = [rig.leftPlant, rig.rightPlant];
    const planted = [rig.leftPlanted, rig.rightPlanted];
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      const base = rig.root.localToWorld(
        new THREE.Vector3(sign * 0.185, 0, sign * 0.045),
      );
      const phase = ((phases[side] % TAU) + TAU) % TAU;
      const stance = speed < 0.2 || phase >= Math.PI;
      const target = base.clone();
      const stepLength = Math.min(0.32, speed * 0.055);
      if (stance) {
        if (
          !rig.feetReady ||
          !planted[side] ||
          plants[side].distanceTo(
            new THREE.Vector3(pelvisWorld.x, 0, pelvisWorld.z),
          ) > 0.55
        ) {
          plants[side].copy(base).addScaledVector(heading, stepLength * 0.55);
          plants[side].y = 0;
        }
        target.copy(plants[side]);
      } else {
        const t = phase / Math.PI;
        target.addScaledVector(
          heading,
          THREE.MathUtils.lerp(-stepLength, stepLength, t),
        );
        target.y = Math.sin(t * Math.PI) * (0.055 + Math.min(speed, 5) * 0.01);
      }
      target.y += 0.08 * rig.bodyScale;
      this.solveLeg(rig, sign, target);
      if (side === 0) rig.leftPlanted = stance;
      else rig.rightPlanted = stance;
    }
    rig.feetReady = true;
  }

  private solveLeg(rig: Rig, side: number, worldAnkle: THREE.Vector3) {
    const hip = side < 0 ? rig.leftLeg : rig.rightLeg;
    const knee = side < 0 ? rig.leftKnee : rig.rightKnee;
    const ankle = side < 0 ? rig.leftAnkle : rig.rightAnkle;
    const target = rig.body.worldToLocal(worldAnkle.clone());
    const delta = target.clone().sub(hip.position),
      length = clamp(delta.length(), 0.09, 0.808);
    const axis = delta.normalize();
    const pole = new THREE.Vector3(side * 0.12, 0, -1)
      .addScaledVector(axis, -new THREE.Vector3(side * 0.12, 0, -1).dot(axis))
      .normalize();
    const cosine = clamp(
      (0.43 ** 2 + length ** 2 - 0.379 ** 2) / (2 * 0.43 * length),
      -1,
      1,
    );
    const bend = hip.position
      .clone()
      .addScaledVector(axis, 0.43 * cosine)
      .addScaledVector(pole, 0.43 * Math.sqrt(1 - cosine ** 2));
    const upperQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      bend.clone().sub(hip.position).normalize(),
    );
    const lowerQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      target
        .clone()
        .sub(bend)
        .normalize()
        .applyQuaternion(upperQ.clone().invert()),
    );
    hip.quaternion.copy(upperQ);
    knee.quaternion.copy(lowerQ);
    const worldParent = rig.body
      .getWorldQuaternion(new THREE.Quaternion())
      .multiply(upperQ)
      .multiply(lowerQ);
    const desiredFoot = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rig.root.rotation.y + rig.body.rotation.y * 0.5 + side * 0.045,
    );
    ankle.quaternion.copy(worldParent.invert().multiply(desiredFoot));
  }

  private updateImpacts(state: TacticalView, time: number) {
    const impact = state.lastBounce;
    if (impact) {
      const key = `${impact.time}:${impact.surface}:${impact.x}:${impact.z}`;
      if (key !== this.lastBounceKey && time - impact.time < 0.15) {
        this.lastBounceKey = key;
        const pulse = this.impactPulses.reduce((oldest, candidate) =>
          candidate.started < oldest.started ? candidate : oldest,
        );
        pulse.started = impact.time;
        pulse.wall = impact.surface !== 'suelo';
        pulse.mesh.position.set(impact.x, impact.y, impact.z);
        pulse.mesh.rotation.set(0, 0, 0);
        pulse.mesh.material.color.set(pulse.wall ? 0xb9e7ec : 0xe1f5b7);
        if (impact.surface === 'suelo') {
          pulse.mesh.position.y = 0.045;
          pulse.mesh.rotation.x = -Math.PI / 2;
        } else if (impact.surface === 'red') {
          pulse.mesh.position.z = impact.z >= 0 ? 0.05 : -0.05;
        } else if (Math.abs(impact.x) > 4.8) {
          pulse.mesh.position.x = Math.sign(impact.x) * 4.965;
          pulse.mesh.rotation.y = Math.PI / 2;
        } else {
          pulse.mesh.position.z = Math.sign(impact.z) * 9.965;
        }
      }
    }
    for (const pulse of this.impactPulses) {
      const progress = (time - pulse.started) / (pulse.wall ? 0.48 : 0.38);
      pulse.mesh.visible = progress >= 0 && progress < 1;
      if (!pulse.mesh.visible) continue;
      pulse.mesh.scale.setScalar(1 + progress * (pulse.wall ? 4.0 : 3.0));
      pulse.mesh.material.opacity =
        (pulse.wall ? 0.58 : 0.45) * (1 - progress) ** 2;
    }
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
    if (Math.abs(this.exteriorFocus) > 0.25) {
      const amount = clamp(Math.abs(this.exteriorFocus) / 7, 0, 1);
      this.desiredTarget.x = this.exteriorFocus * 0.33;
      this.desiredCamera.x += this.exteriorFocus * 0.2;
      this.desiredCamera.y += amount * 1.6;
      this.camera.fov += amount * (narrow ? 8 : 5);
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
