/**
 * 실험실 스케치를 뽑는 개발 도구(책에는 실리지 않는다). 개발 서버를 띄우고
 * /lab-sketch.html?lab=physics (또는 chemistry)를 열면, 실험실 공간 GLB와 자리에 놓인 모델을
 * 공간에 들어 있는 카메라(CAM_main) 시점에서 선으로 그려 보여 준다.
 * 받은 WebP를 public/labs/<lab>-sketch.webp로 넣으면 책의 스케치가 바뀐다.
 * 모델 목록이나 자리를 바꾼 뒤에는 다시 뽑는다.
 */
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LABS } from '../content/labs/labs.ts';
import { modelsOf, modelUrl, type LabId } from '../content/labs/models.ts';
import { assignSlots, fitModel, parseRoom, placementOf } from '../content/labs/room.ts';
import { contentBox, inkImage, ROOM_ID, thicken, traceLines } from './sketchLines.ts';

/** 그리는 크기(공간 GLB의 카메라와 같은 4:3) */
const WIDTH = 1600;
const HEIGHT = 1200;
/** 선이 매끄럽게 이만큼 크게 그린 뒤 줄인다. */
const SUPER = 2;
/** 책에 싣는 스케치의 가로 크기와 선 둘레에 남기는 여백(화소) */
const OUT_WIDTH = 1400;
const PAD = 24;
/** 연필 선의 색 */
const INK: [number, number, number] = [86, 86, 86];

const GEOMETRY_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying float vDistance;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vDistance = -view.z;
  gl_Position = projectionMatrix * view;
}`;

const GEOMETRY_FRAGMENT = /* glsl */ `
uniform float uId;
varying vec3 vNormal;
varying float vDistance;
void main() {
  vec3 normal = normalize(vNormal);
  if (!gl_FrontFacing) normal = -normal;
  gl_FragColor = vec4(normal.xy, vDistance, uId);
}`;

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

/** 방과 모델을 한 장면에 놓고, 메시마다 번호(모델 1…, 방 ROOM_ID…)와 바탕색 텍스처를 적어 둔다. */
async function buildScene(lab: LabId) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const room = await loader.loadAsync(LABS[lab].room);
  const camera = room.cameras.find((entry) => entry instanceof THREE.PerspectiveCamera);
  if (!camera) throw new Error('공간 GLB에 카메라(CAM_main)가 없어요.');
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();

  const scene = new THREE.Scene();
  scene.add(room.scene);
  const ids = new Map<THREE.Mesh, number>();
  const textures = new Map<THREE.Mesh, THREE.Texture>();
  let roomId = ROOM_ID;
  room.scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    // 유리는 그리지 않는다(뒤가 비쳐 보이게).
    const glass = materialsOf(child).some(
      (material) => material.transparent && material.opacity < 1,
    );
    if (glass) child.visible = false;
    else ids.set(child, roomId++);
  });

  // 책의 장면(LabScene)과 같은 방법으로 모델을 자리에 놓는다.
  const { slots } = parseRoom(room.scene);
  const models = modelsOf(lab);
  const placed = assignSlots(models, slots.keys());
  for (const [index, model] of models.entries()) {
    const slot = placed.get(model.id);
    const position = slot === undefined ? undefined : slots.get(slot);
    if (slot === undefined || !position) continue;
    const { space, turn } = placementOf(model, slot);
    const gltf = await loader.loadAsync(modelUrl(model));
    gltf.scene.updateMatrixWorld(true);
    const fit = fitModel(new THREE.Box3().setFromObject(gltf.scene), space, turn);
    const sized = new THREE.Group();
    sized.position.copy(fit.offset);
    sized.scale.setScalar(fit.scale);
    sized.add(gltf.scene);
    const turned = new THREE.Group();
    turned.rotation.y = THREE.MathUtils.degToRad(turn);
    turned.position.copy(position);
    turned.add(sized);
    scene.add(turned);
    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      ids.set(child, index + 1);
      const [material] = materialsOf(child);
      if (material instanceof THREE.MeshStandardMaterial && material.map) {
        textures.set(child, material.map);
      }
    });
  }
  scene.updateMatrixWorld(true);
  return { scene, camera, ids, textures };
}

/** 장면의 재질을 잠깐 바꿔 그리고, 그린 결과를 화소(실수)로 읽어 온다. */
function renderPass(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLRenderTarget,
  scene: THREE.Scene,
  camera: THREE.Camera,
  materialOf: (mesh: THREE.Mesh) => THREE.Material,
): Float32Array {
  const original = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    original.set(child, child.material);
    child.material = materialOf(child);
  });
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  const pixels = new Float32Array(target.width * target.height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels);
  renderer.setRenderTarget(null);
  for (const [mesh, material] of original) mesh.material = material;
  return pixels;
}

/** 실험실 하나의 스케치를 그려 canvas로 돌려준다(선이 있는 범위만 잘라 가로 OUT_WIDTH로 줄인 것). */
async function drawSketch(lab: LabId): Promise<HTMLCanvasElement> {
  const { scene, camera, ids, textures } = await buildScene(lab);
  const width = WIDTH * SUPER;
  const height = HEIGHT * SUPER;
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.FloatType });

  // 1) 법선·거리·번호
  const numbered = new Map<number, THREE.ShaderMaterial>();
  const geometry = renderPass(renderer, target, scene, camera, (mesh) => {
    const id = ids.get(mesh) ?? ROOM_ID;
    let material = numbered.get(id);
    if (!material) {
      material = new THREE.ShaderMaterial({
        uniforms: { uId: { value: id } },
        vertexShader: GEOMETRY_VERTEX,
        fragmentShader: GEOMETRY_FRAGMENT,
        side: THREE.DoubleSide,
      });
      numbered.set(id, material);
    }
    return material;
  });

  // 2) 바탕색: 모델은 텍스처 그대로(눈금·글자 같은 무늬를 선으로 옮긴다), 방은 흰색
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  const textured = new Map<THREE.Texture, THREE.MeshBasicMaterial>();
  const color = renderPass(renderer, target, scene, camera, (mesh) => {
    const map = textures.get(mesh);
    if (!map) return white;
    let material = textured.get(map);
    if (!material) {
      material = new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide });
      textured.set(map, material);
    }
    return material;
  });

  for (const material of [white, ...numbered.values(), ...textured.values()]) material.dispose();
  target.dispose();
  renderer.dispose();

  const traced = traceLines({ width, height, geometry, color });
  const lines = { strong: thicken(traced.strong, width, height), soft: traced.soft };
  const image = inkImage(lines, width, height, SUPER, INK);

  const full = document.createElement('canvas');
  full.width = image.width;
  full.height = image.height;
  full.getContext('2d')?.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);

  const box = contentBox(image.data, image.width, image.height, PAD);
  const result = document.createElement('canvas');
  result.width = OUT_WIDTH;
  result.height = Math.round((box.h * OUT_WIDTH) / box.w);
  const ctx = result.getContext('2d');
  if (!ctx) throw new Error('canvas를 쓸 수 없어요.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(full, box.x, box.y, box.w, box.h, 0, 0, result.width, result.height);
  return result;
}

async function main(): Promise<void> {
  const status = document.querySelector<HTMLElement>('#status');
  const download = document.querySelector<HTMLAnchorElement>('#download');
  const frame = document.querySelector<HTMLElement>('#sketch');
  if (!status || !download || !frame) return;
  const lab: LabId =
    new URLSearchParams(window.location.search).get('lab') === 'chemistry'
      ? 'chemistry'
      : 'physics';
  status.textContent = `${LABS[lab].title} 스케치를 그리는 중…`;
  const canvas = await drawSketch(lab);
  frame.replaceChildren(canvas);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', 0.84);
  });
  if (!blob) throw new Error('WebP로 바꾸지 못했어요.');
  download.href = URL.createObjectURL(blob);
  download.download = `${lab}-sketch.webp`;
  download.hidden = false;
  status.textContent = `${LABS[lab].title} 스케치 (${canvas.width} × ${canvas.height}, ${Math.round(blob.size / 1024)} KB). 받은 파일을 public/labs/에 넣으세요.`;
}

main().catch((error: unknown) => {
  const status = document.querySelector<HTMLElement>('#status');
  if (status)
    status.textContent = `그리지 못했어요: ${error instanceof Error ? error.message : String(error)}`;
});
