import * as THREE from 'three';
import { COLORS } from '../book/constants.ts';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * 점들을 차례로 잇는 줄(가는 원기둥 토막들). 도르래에 걸친 줄처럼 매 프레임 모양이 바뀌는 줄에 쓴다.
 * 매 프레임 `begin()` → `add(x, y, z)`를 점마다 → `commit()` 순서로 부른다.
 * 장면에는 `<primitive object={rope.mesh} />`로 넣는다.
 */
export function createRope(maxPoints: number, radius = 0.003, color: string = COLORS.ink) {
  const geometry = new THREE.CylinderGeometry(radius, radius, 1, 6, 1, true);
  const material = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, maxPoints - 1));
  mesh.frustumCulled = false;
  mesh.count = 0;
  const points = new Float32Array(maxPoints * 3);
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const middle = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  let used = 0;

  return {
    mesh,
    begin() {
      used = 0;
    },
    add(x: number, y: number, z: number) {
      if (used >= maxPoints) return;
      points[used * 3] = x;
      points[used * 3 + 1] = y;
      points[used * 3 + 2] = z;
      used++;
    },
    commit() {
      let count = 0;
      for (let i = 0; i + 1 < used; i++) {
        from.fromArray(points, i * 3);
        to.fromArray(points, (i + 1) * 3);
        direction.subVectors(to, from);
        const length = direction.length();
        if (length < 1e-5) continue;
        quaternion.setFromUnitVectors(UP, direction.divideScalar(length));
        middle.addVectors(from, to).multiplyScalar(0.5);
        matrix.compose(middle, quaternion, scale.set(1, length, 1));
        mesh.setMatrixAt(count++, matrix);
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}

export type Rope = ReturnType<typeof createRope>;
