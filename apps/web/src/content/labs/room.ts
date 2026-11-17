import * as THREE from 'three';

/**
 * 실험실 공간 GLB(힉스필드 3D Jutsu에서 만든 방)를 장면에서 쓰기 좋게 풀어 놓는다.
 * 맨 위 노드의 이름으로 역할을 가린다: ENV_ 바닥·벽, PRP_ 가구, SLOT_ 모델을 놓을 자리.
 * 카메라와 조명(CAM_, LGT_)은 쓰지 않는다.
 */
export interface RoomPart {
  key: string;
  geometry: THREE.BufferGeometry;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  /** 물감 색(#rrggbb) */
  color: string;
  /** 유리처럼 비치는 부분 */
  glass: boolean;
  /** 칠판 글씨처럼 선을 두르지 않는 부분 */
  plain: boolean;
  /** 손잡이처럼 작은 부분(윤곽선 껍질을 생략한다) */
  small: boolean;
}

export interface RoomUnit {
  name: string;
  /** 바닥과 벽인지(가구보다 먼저 일어선다) */
  env: boolean;
  parts: RoomPart[];
  /** 일어서기 시작하는 등장 시간(0~1) */
  at: number;
}

export interface Room {
  units: RoomUnit[];
  /** 모델을 놓을 자리: 이름 → 방 좌표(m) */
  slots: Map<string, THREE.Vector3>;
}

const SMALL = 0.09;

function partsOf(node: THREE.Object3D): RoomPart[] {
  const parts: RoomPart[] = [];
  node.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry: unknown = child.geometry;
    if (!(geometry instanceof THREE.BufferGeometry)) return;
    const materials: unknown[] = Array.isArray(child.material) ? child.material : [child.material];
    const first = materials[0] instanceof THREE.Material ? materials[0] : undefined;
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    child.matrixWorld.decompose(position, quaternion, scale);
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    const radius = (geometry.boundingSphere?.radius ?? 1) * Math.max(scale.x, scale.y, scale.z);
    const color =
      first && 'color' in first && first.color instanceof THREE.Color
        ? `#${first.color.getHexString()}`
        : '#cccccc';
    parts.push({
      key: `${child.name}-${parts.length}`,
      geometry,
      position,
      quaternion,
      scale,
      color,
      glass: Boolean(first?.transparent) && (first?.opacity ?? 1) < 1,
      plain: child.name.startsWith('board_text'),
      small: radius < SMALL,
    });
  });
  return parts;
}

/** GLB의 장면을 바닥·벽 한 묶음과 가구 묶음들, 모델 자리로 나눈다. */
export function parseRoom(root: THREE.Object3D): Room {
  root.updateMatrixWorld(true);
  const env: RoomPart[] = [];
  const props: { name: string; parts: RoomPart[]; order: number }[] = [];
  const slots = new Map<string, THREE.Vector3>();
  for (const child of root.children) {
    if (child.name.startsWith('SLOT_')) {
      slots.set(child.name, child.getWorldPosition(new THREE.Vector3()));
    } else if (child.name.startsWith('ENV_')) {
      env.push(...partsOf(child));
    } else if (child.name.startsWith('PRP_')) {
      const center = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());
      // 뒤쪽 왼쪽 구석에서 가까운 가구부터 일어선다.
      props.push({ name: child.name, parts: partsOf(child), order: center.x + center.z });
    }
  }
  props.sort((a, b) => a.order - b.order);
  const units: RoomUnit[] = [{ name: 'ENV', env: true, parts: env, at: 0 }];
  props.forEach((prop, index) => {
    units.push({
      name: prop.name,
      env: false,
      parts: prop.parts,
      at: 0.14 + (0.4 * index) / Math.max(1, props.length - 1),
    });
  });
  return { units, slots };
}

/** 모델을 놓기 좋은 자리 순서: 가운데 실험대 → 뒤 실험대 → 왼쪽 실험대 → 수레 → 선반 → 바닥 */
const PREFERENCE = ['island', 'back', 'left', 'cart', 'shelf', 'floor'];

function rank(slot: string): number {
  const [, place = '', number = '0'] = slot.split('_');
  const index = PREFERENCE.indexOf(place);
  return (index < 0 ? PREFERENCE.length : index) * 100 + Number(number);
}

/**
 * 모델마다 놓을 자리를 정한다. 자리를 정해 둔 모델을 먼저 놓고,
 * 나머지는 빈 자리에 좋은 순서대로 놓는다. 자리가 모자라면 남는 모델은 놓지 않는다.
 */
export function assignSlots(
  models: { id: string; slot?: string }[],
  slots: Iterable<string>,
): Map<string, string> {
  const free = [...slots].toSorted((a, b) => rank(a) - rank(b));
  const placed = new Map<string, string>();
  for (const model of models) {
    if (model.slot && free.includes(model.slot)) {
      placed.set(model.id, model.slot);
      free.splice(free.indexOf(model.slot), 1);
    }
  }
  for (const model of models) {
    if (placed.has(model.id)) continue;
    const slot = free.shift();
    if (slot === undefined) break;
    placed.set(model.id, slot);
  }
  return placed;
}

/**
 * 모델을 정해진 크기로 맞춘다: 가장 긴 변이 size가 되게 줄이거나 키우고,
 * 가로·세로 가운데를 원점에, 바닥을 높이 0에 둔다. 돌려주는 값은 배율과 옮길 거리(배율을 곱한 뒤).
 */
export function fitModel(box: THREE.Box3, size: number): { scale: number; offset: THREE.Vector3 } {
  const extent = box.getSize(new THREE.Vector3());
  const longest = Math.max(extent.x, extent.y, extent.z);
  const scale = longest > 0 ? size / longest : 1;
  const center = box.getCenter(new THREE.Vector3());
  return {
    scale,
    offset: new THREE.Vector3(-center.x * scale, -box.min.y * scale, -center.z * scale),
  };
}
