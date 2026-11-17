import * as THREE from 'three';

export interface Dot {
  x: number;
  y: number;
  z: number;
  color: string;
}

/**
 * 같은 크기의 작은 점 여러 개(기록 테이프의 점, 눈금 표시). +z를 향한 납작한 동그라미다.
 * `place(점들)`로 자리와 색을 정해 두고 `show(개수)`로 앞에서부터 몇 개를 보일지 정한다.
 * 장면에는 `<primitive object={dots.mesh} />`로 넣는다.
 */
export function createDots(max: number, radius = 0.0055) {
  const geometry = new THREE.CircleGeometry(radius, 16);
  const material = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const mesh = new THREE.InstancedMesh(geometry, material, max);
  mesh.frustumCulled = false;
  mesh.count = 0;
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  let placed = 0;

  return {
    mesh,
    place(dots: Dot[]) {
      placed = Math.min(max, dots.length);
      for (let i = 0; i < placed; i++) {
        const dot = dots[i];
        if (!dot) continue;
        mesh.setMatrixAt(i, matrix.makeTranslation(dot.x, dot.y, dot.z));
        mesh.setColorAt(i, color.set(dot.color));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.count = Math.min(mesh.count, placed);
    },
    show(count: number) {
      mesh.count = Math.max(0, Math.min(placed, count));
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
