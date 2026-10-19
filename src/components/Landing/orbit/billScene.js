import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { BILL_ASPECT, createBillTextures } from "./billTextures";

/*
Escena 3D de la seccion de funcionalidades: el billete de bolsillox en el
centro, con anillos de luz y un disco de particulas que orbita alrededor.

- La ondulacion del billete y el giro de las particulas se calculan en la GPU
  (vertex shaders), asi el procesador queda libre para el scroll.
- El canvas es transparente: se ve el fondo real de la pagina en los dos temas.
  En oscuro la luz se suma (particulas y resplandor de los anillos); en claro
  los colores son solidos.
- El resplandor de los anillos es una textura, no un post-proceso: no hace
  falta una segunda pasada de render y el fondo queda exacto.
- quality "low" (celular): menos particulas, texturas mas chicas y sin sombras.

Uso: const scene = createBillScene(container, { theme, quality });
     scene.update(dt, { progress, pointerX, pointerY }); scene.render();
*/

const GREEN = 0x3ecf8e;
const GREEN_LIGHT = 0x0b8a5f;

// Ondulacion del papel: posicion y normal salen de la misma funcion.
const WAVE_GLSL = `
uniform float uTime;
uniform float uHalf;
float waveZ(vec2 p) {
  float u = p.x / uHalf;
  return .09 * sin(1.8 * p.x + 1.6 * uTime) * (.65 + .35 * cos(1.6 * p.y + uTime))
       + .11 * u * u * sin(.8 * uTime);
}
vec3 waveNormal(vec2 p) {
  float e = .01;
  float dx = (waveZ(p + vec2(e, 0.)) - waveZ(p - vec2(e, 0.))) / (2. * e);
  float dy = (waveZ(p + vec2(0., e)) - waveZ(p - vec2(0., e))) / (2. * e);
  return normalize(vec3(-dx, -dy, 1.));
}`;

const DISK_VERTEX = `
attribute float aRadius;
attribute float aAngle;
attribute float aSpeed;
attribute float aHeight;
attribute float aSeed;
uniform float uPhase;
uniform float uShrink;
uniform float uPixelRatio;
uniform float uTime;
uniform float uLight;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float a = aAngle + uPhase * aSpeed;
  float r = aRadius * (1. - uShrink * .22);
  vec4 mv = modelViewMatrix * vec4(cos(a) * r, aHeight, sin(a) * r, 1.);
  gl_Position = projectionMatrix * mv;
  float t = clamp((aRadius - 2.15) / 1.4, 0., 1.);
  float doppler = 1. + .5 * cos(a);
  float twinkle = .75 + .25 * sin(uTime * 3. + aSeed * 40.);
  vec3 darkColor = mix(vec3(.75, 1.05, .9), vec3(.12, .5, .34), t) * doppler * twinkle * (.8 - t * .45);
  vec3 lightColor = mix(vec3(.02, .32, .2), vec3(.2, .58, .42), t);
  vColor = mix(darkColor, lightColor, uLight);
  vAlpha = mix(.8 - t * .5, (.7 - t * .45) * (.7 + .3 * doppler), uLight);
  gl_PointSize = (2. + aSeed * 3.) * uPixelRatio * (6. / -mv.z);
}`;

const DISK_FRAGMENT = `
uniform float uLight;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - .5);
  float f = smoothstep(.5, 0., d) * vAlpha;
  // Oscuro: se suma luz (blending aditivo). Claro: punto solido con alpha.
  gl_FragColor = uLight > .5 ? vec4(vColor, f) : vec4(vColor * f, f);
}`;

function seeded(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function glowTexture(stops) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBillScene(container, { theme = "dark", quality = "high" } = {}) {
  const low = quality === "low";
  const rand = seeded(11);

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  pmrem.dispose();

  // ---------- luces ----------
  const hemi = new THREE.HemisphereLight(0xe8f5ec, 0x06100b, 0.18);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1dc, 1.7);
  key.position.set(-3.5, 4.5, 5);
  key.castShadow = !low;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2, bottom: -2, near: 1, far: 15 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5dffb0, 1.6);
  rim.position.set(3, 1.5, -5);
  scene.add(rim);
  const core = new THREE.PointLight(GREEN, 5, 7, 2);
  core.position.set(0, 0, -1.1);
  scene.add(core);

  // ---------- billete ----------
  const BILL_W = 2.9;
  const BILL_H = BILL_W / BILL_ASPECT;
  const waveUniforms = { uTime: { value: 0 }, uHalf: { value: BILL_W / 2 } };
  const waveify = (material) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = waveUniforms.uTime;
      shader.uniforms.uHalf = waveUniforms.uHalf;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${WAVE_GLSL}`)
        .replace("#include <beginnormal_vertex>", "vec3 objectNormal = waveNormal(position.xy);")
        .replace("#include <begin_vertex>", "vec3 transformed = vec3(position.xy, waveZ(position.xy));");
    };
    return material;
  };

  const canvases = createBillTextures(low ? 0.5 : 1);
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const textures = [];
  const texture = (canvas, { color = false, mirror = false } = {}) => {
    const t = new THREE.CanvasTexture(canvas);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    if (mirror) {
      t.wrapS = THREE.RepeatWrapping;
      t.repeat.x = -1;
      t.offset.x = 1;
    }
    textures.push(t);
    return t;
  };
  const billMaterial = (color, normal, mask, side, mirror) => {
    const pbr = texture(mask, { mirror });
    // En el celular un material mas simple (sin iridiscencia ni sheen): el
    // shader del fisico es pesado para GPUs de gama baja.
    if (low) {
      return waveify(
        new THREE.MeshStandardMaterial({
          map: texture(color, { color: true, mirror }),
          normalMap: texture(normal, { mirror }),
          normalScale: new THREE.Vector2(0.45, 0.45),
          roughness: 1,
          roughnessMap: pbr,
          metalness: 1,
          metalnessMap: pbr,
          envMapIntensity: 0.3,
          side,
        }),
      );
    }
    return waveify(
      new THREE.MeshPhysicalMaterial({
        map: texture(color, { color: true, mirror }),
        normalMap: texture(normal, { mirror }),
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughness: 1,
        roughnessMap: pbr,
        metalness: 1,
        metalnessMap: pbr,
        iridescence: 0.55,
        iridescenceMap: pbr,
        iridescenceIOR: 1.45,
        iridescenceThicknessRange: [260, 520],
        sheen: 0.35,
        sheenColor: new THREE.Color(0xd8efe0),
        sheenRoughness: 0.7,
        envMapIntensity: 0.3,
        side,
      }),
    );
  };

  const billGeometry = new THREE.PlaneGeometry(BILL_W, BILL_H, low ? 64 : 128, low ? 28 : 54);
  const frontMaterial = billMaterial(canvases.front, canvases.frontNormal, canvases.frontMask, THREE.FrontSide, false);
  const backMaterial = billMaterial(canvases.back, canvases.backNormal, canvases.backMask, THREE.BackSide, true);
  const depthMaterial = waveify(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
  const front = new THREE.Mesh(billGeometry, frontMaterial);
  const back = new THREE.Mesh(billGeometry, backMaterial);
  front.customDepthMaterial = depthMaterial;
  front.castShadow = !low;
  front.receiveShadow = !low;
  back.receiveShadow = !low;
  const bill = new THREE.Group();
  [front, back].forEach((mesh) => {
    mesh.frustumCulled = false;
    bill.add(mesh);
  });
  // Todo lo que orbita va en un grupo: en el celular se achica para que las
  // tarjetas entren alrededor sin taparlo.
  const world = new THREE.Group();
  scene.add(world);
  world.add(bill);

  // ---------- halo y anillos (horizonte) ----------
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture([
        [0, "rgba(62,207,142,.22)"],
        [0.3, "rgba(62,207,142,.07)"],
        [0.6, "rgba(20,90,60,.02)"],
        [1, "rgba(0,0,0,0)"],
      ]),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  halo.scale.set(10, 10, 1);
  halo.position.z = -1.6;
  world.add(halo);

  const ringMaterial = new THREE.MeshBasicMaterial({ color: GREEN });
  const ringMaterial2 = new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.5 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.012, 8, 256), ringMaterial);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.005, 8, 256), ringMaterial2);
  ring.position.z = -1.2;
  ring2.position.z = -1.25;
  world.add(ring, ring2);

  // Resplandor del anillo: un aro difuminado dibujado en canvas.
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 512;
  const glowCtx = glowCanvas.getContext("2d");
  glowCtx.strokeStyle = "rgba(62,207,142,1)";
  glowCtx.shadowColor = "rgba(62,207,142,1)";
  for (const [width, blur, alpha] of [[14, 40, 0.35], [6, 18, 0.5], [2, 6, 0.9]]) {
    glowCtx.globalAlpha = alpha;
    glowCtx.lineWidth = width;
    glowCtx.shadowBlur = blur;
    glowCtx.beginPath();
    glowCtx.arc(256, 256, 200, 0, Math.PI * 2);
    glowCtx.stroke();
  }
  const glowTextureRing = new THREE.CanvasTexture(glowCanvas);
  glowTextureRing.colorSpace = THREE.SRGBColorSpace;
  const ringGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTextureRing, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }),
  );
  // 200 px de radio en un canvas de 512 = radio 1,95 del anillo.
  ringGlow.scale.setScalar((1.95 * 512) / 200);
  ringGlow.position.z = -1.22;
  world.add(ringGlow);

  // ---------- disco de particulas ----------
  const count = low ? 5000 : 12000;
  const attrs = { aRadius: [], aAngle: [], aSpeed: [], aHeight: [], aSeed: [] };
  for (let i = 0; i < count; i++) {
    const radius = 2.15 + Math.pow(rand(), 2.2) * 1.4;
    attrs.aRadius.push(radius);
    attrs.aAngle.push(rand() * Math.PI * 2);
    attrs.aSpeed.push(0.6 / Math.pow(radius, 1.5));
    attrs.aHeight.push((rand() - 0.5) * 0.05 * radius);
    attrs.aSeed.push(rand());
  }
  const diskGeometry = new THREE.BufferGeometry();
  diskGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  Object.entries(attrs).forEach(([name, values]) => {
    diskGeometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(values), 1));
  });
  // Las posiciones reales se calculan en el shader: la caja de recorte es fija.
  diskGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
  const diskUniforms = {
    uPhase: { value: 0 },
    uShrink: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uTime: { value: 0 },
    uLight: { value: 0 },
  };
  const diskMaterial = new THREE.ShaderMaterial({
    uniforms: diskUniforms,
    vertexShader: DISK_VERTEX,
    fragmentShader: DISK_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const disk = new THREE.Points(diskGeometry, diskMaterial);
  const diskHolder = new THREE.Group();
  diskHolder.add(disk);
  world.add(diskHolder);

  // ---------- estrellas ----------
  const starCount = low ? 400 : 900;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (rand() - 0.5) * 44;
    starPositions[i * 3 + 1] = (rand() - 0.5) * 26;
    starPositions[i * 3 + 2] = -9 - rand() * 14;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ size: 0.045, color: 0x9fb0a7, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  scene.add(stars);

  // ---------- tema ----------
  let isLight = false;
  function setTheme(next) {
    isLight = next === "light";
    // Canvas transparente en los dos temas: se ve el fondo real de la pagina
    // y el resplandor del modo oscuro se suma encima.
    renderer.setClearColor(0x000000, 0);
    renderer.toneMappingExposure = isLight ? 1 : 0.72;
    hemi.intensity = isLight ? 0.6 : 0.18;
    rim.intensity = isLight ? 0.8 : 1.6;
    core.intensity = isLight ? 2 : 5;
    [frontMaterial, backMaterial].forEach((m) => {
      m.envMapIntensity = isLight ? 0.6 : 0.3;
    });
    diskUniforms.uLight.value = isLight ? 1 : 0;
    diskMaterial.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    diskMaterial.needsUpdate = true;
    halo.material.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    halo.material.needsUpdate = true;
    ringMaterial.color.set(isLight ? GREEN_LIGHT : 0x8af0c0);
    ringMaterial2.color.set(isLight ? GREEN_LIGHT : GREEN);
    ringGlow.visible = !isLight;
    stars.visible = !isLight;
  }
  setTheme(theme);

  // ---------- tamaño ----------
  let mobileFrame = false;
  function resize(width, height) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    mobileFrame = w < 768;
    world.scale.setScalar(mobileFrame ? 0.62 : 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  // ---------- animacion ----------
  let time = 0;
  let phase = 0;
  function update(dt, { progress = 0, pointerX = 0, pointerY = 0, still = false } = {}) {
    if (!still) time += dt;
    phase += dt * (1 + progress * 2.2);
    waveUniforms.uTime.value = time;

    bill.rotation.y = progress * Math.PI * 4 + Math.sin(time * 0.6) * 0.22 + pointerX * 0.45;
    bill.rotation.x = -0.08 + Math.sin(time * 0.7) * 0.07 + pointerY * 0.25;
    bill.position.y = Math.sin(time * 1.1) * 0.07;

    diskUniforms.uPhase.value = phase;
    diskUniforms.uShrink.value = progress;
    diskUniforms.uTime.value = time;
    diskHolder.rotation.x = 0.34 - progress * 0.22 + pointerY * 0.08;
    diskHolder.rotation.z = -0.1 + pointerX * 0.08;
    ring.scale.setScalar(1 - progress * 0.12);
    ring2.scale.setScalar(1 - progress * 0.1);
    ringGlow.scale.setScalar(((1.95 * 512) / 200) * (1 - progress * 0.12));
    ringGlow.material.opacity = 0.5 + Math.sin(time * 1.4) * 0.08;
    halo.material.opacity = (isLight ? 0.45 : 0.6) + Math.sin(time * 1.4) * 0.06 + progress * 0.15;

    // La camara se acerca a mitad del recorrido y vuelve al final.
    const dive = Math.sin(progress * Math.PI);
    camera.position.set(pointerX * 0.5, 0.25 - pointerY * 0.3, (mobileFrame ? 12 : 10) - dive * 0.8);
    camera.lookAt(0, 0, 0);
    stars.rotation.z = time * 0.004 + progress * 0.35;
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    scene.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        material?.map?.dispose();
        material?.dispose();
      });
    });
    textures.forEach((t) => t.dispose());
    depthMaterial.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { update, render, resize, setTheme, dispose };
}
