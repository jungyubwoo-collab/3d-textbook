import * as THREE from 'three';

/**
 * 종이 한 장(또는 표지)을 뼈대가 든 메시로 만든다.
 * 책등(x = 0)에서 바깥쪽으로 뼈를 이어 붙이고, 뼈를 돌려 책장을 넘기고 휘게 한다.
 * BoxGeometry 면 순서: 0 +x, 1 -x, 2 +y(앞면), 3 -y(뒷면), 4 +z, 5 -z
 */
export interface LeafRig {
  mesh: THREE.SkinnedMesh;
  bones: THREE.Bone[];
  front: THREE.MeshStandardMaterial;
  back: THREE.MeshStandardMaterial;
  dispose(): void;
}

export interface LeafRigOptions {
  width: number;
  height: number;
  depth: number;
  segments: number;
  faceColor: THREE.ColorRepresentation;
  edgeColor: THREE.ColorRepresentation;
  roughness: number;
}

export function createLeafRig(options: LeafRigOptions): LeafRig {
  const { width, height, depth, segments } = options;
  const geometry = new THREE.BoxGeometry(width, depth, height, segments, 1, 1);
  geometry.translate(width / 2, 0, 0);

  // 각 꼭짓점을 x 위치에 해당하는 뼈 하나에 묶는다(꼭짓점이 뼈 위치에 정확히 놓인다).
  const position = geometry.getAttribute('position');
  const segmentWidth = width / segments;
  const skinIndex: number[] = [];
  const skinWeight: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const bone = Math.min(segments, Math.max(0, Math.round(position.getX(i) / segmentWidth)));
    skinIndex.push(bone, 0, 0, 0);
    skinWeight.push(1, 0, 0, 0);
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));

  const bones: THREE.Bone[] = [];
  for (let i = 0; i <= segments; i++) {
    const bone = new THREE.Bone();
    if (i > 0) {
      bone.position.x = segmentWidth;
      bones[i - 1]!.add(bone);
    }
    bones.push(bone);
  }

  const edge = new THREE.MeshStandardMaterial({ color: options.edgeColor, roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({
    color: options.faceColor,
    roughness: options.roughness,
  });
  const back = new THREE.MeshStandardMaterial({
    color: options.faceColor,
    roughness: options.roughness,
  });
  const mesh = new THREE.SkinnedMesh(geometry, [edge, edge, front, back, edge, edge]);
  mesh.add(bones[0]!);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // 뼈가 움직이면 경계 구가 맞지 않으므로 화면 밖 판정을 끈다.
  mesh.frustumCulled = false;

  return {
    mesh,
    bones,
    front,
    back,
    dispose() {
      geometry.dispose();
      edge.dispose();
      front.dispose();
      back.dispose();
    },
  };
}

/** 면에 텍스처를 붙이거나 떼고, 텍스처가 없을 때는 바탕색으로 칠한다. */
export function applyFace(
  material: THREE.MeshStandardMaterial,
  texture: THREE.Texture | null,
  fallbackColor: THREE.ColorRepresentation,
): void {
  if (material.map === texture) return;
  material.map = texture;
  material.color.set(texture ? '#ffffff' : fallbackColor);
  material.needsUpdate = true;
}
