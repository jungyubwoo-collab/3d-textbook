import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { book } from '../content/book.ts';
import { inkUniforms } from '../ink/inkMaterial.ts';
import { playPageTurn, playPop } from '../lib/sound.ts';
import { bookStore, useBookStore } from '../state/bookStore.ts';
import { BookLeaf } from './BookLeaf.tsx';
import {
  COLORS,
  COVER_DEPTH,
  COVER_HEIGHT,
  COVER_WIDTH,
  DRAG_COMMIT,
  DRAG_EDGE,
  DRAG_THRESHOLD_PX,
  PAGE_WIDTH,
  REVEAL_DURATION,
  TURN_CURL,
  TURN_DURATION,
  TURN_LIFT,
  TURN_STAGGER,
} from './constants.ts';
import type { LeafRig } from './leafRig.ts';
import { SpreadOverlays } from './PageOverlays.tsx';
import { BookRuntimeContext, SceneContext, useBookRuntime, type SceneRuntime } from './runtime.ts';
import { computeStack, curlWeights, easeInOutCubic, type Stack } from './stack.ts';
import { toLeaves, type Leaf } from './structure.ts';
import type { PageSpec } from './types.ts';

interface TurnAnimation {
  from: number;
  to: number;
  start: number;
  duration: number;
}

/** 손으로 끌어 넘기는 중인 장 */
interface PageDrag {
  leaf: number;
  /** 1 = 오른쪽 장을 왼쪽으로, -1 = 왼쪽 장을 오른쪽으로 */
  direction: 1 | -1;
  width: number;
  surfaceY: number;
  startX: number;
  startY: number;
  active: boolean;
  progress: number;
}

interface EdgeHover {
  leaf: number;
  direction: 1 | -1;
}

const { clamp, damp, lerp, smoothstep } = THREE.MathUtils;

const weights: number[] = [];

/** 끌기 위치 계산에 쓰는 도구(책은 한 권이므로 하나만 둔다) */
const dragRay = {
  raycaster: new THREE.Raycaster(),
  plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  pointer: new THREE.Vector2(),
  hit: new THREE.Vector3(),
};

/** 화면 좌표를 높이 y인 수평면 위의 x 좌표로 바꾼다. */
function screenToBookX(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  clientX: number,
  clientY: number,
  y: number,
): number | null {
  const { raycaster, plane, pointer, hit } = dragRay;
  const rect = canvas.getBoundingClientRect();
  pointer.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  plane.constant = -y;
  return raycaster.ray.intersectPlane(plane, hit) ? hit.x : null;
}

/** 카메라 조작(끌어서 돌리기)을 잠시 끄거나 켠다. */
function setControlsEnabled(controls: unknown, enabled: boolean): void {
  if (typeof controls === 'object' && controls !== null) Reflect.set(controls, 'enabled', enabled);
}

/** 장 하나의 자세: p = 넘김 진행도, direction = 넘기는 방향, edgeLift = 가장자리 들림(-1~1) */
function poseLeaf(
  rig: LeafRig,
  leaf: Leaf,
  stack: Stack,
  p: number,
  direction: number,
  edgeLift: number,
): void {
  const i = leaf.index;
  const turning = Math.sin(p * Math.PI);
  rig.mesh.position.y = lerp(stack.right[i]!, stack.left[i]!, p) + turning * TURN_LIFT;
  rig.bones[0]!.rotation.z = p * Math.PI;
  const count = rig.bones.length - 1;
  if (leaf.cover) {
    for (let j = 1; j <= count; j++) rig.bones[j]!.rotation.z = 0;
    return;
  }
  curlWeights(count, direction > 0 ? p : 1 - p, weights);
  const curl = turning * TURN_CURL * direction;
  for (let j = 1; j <= count; j++) {
    let rotation = curl * weights[j - 1]!;
    // 마우스를 올리면 바깥쪽 마지막 몇 마디만 살짝 들어 '잡을 수 있음'을 알린다.
    if (edgeLift !== 0 && j > count - 5) rotation += (edgeLift * 0.07 * (j - (count - 5))) / 5;
    rig.bones[j]!.rotation.z = rotation;
  }
}

/** 책상 위의 책 한 권: 책장, 책등, 팝업 장면, 페이지 위 조작 영역 */
export function Book() {
  const leaves = useMemo(() => toLeaves(book.pages), []);
  const stack = useMemo(() => computeStack(leaves), [leaves]);
  const spread = useBookStore((state) => state.spread);
  const restingSpread = useBookStore((state) => state.restingSpread);
  const setSettled = useBookStore((state) => state.setSettled);
  const clock = useThree((state) => state.clock);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const controls = useThree((state) => state.controls);
  const controlsRef = useRef<unknown>(null);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const rigs = useRef<(LeafRig | null)[]>([]);
  // 처음 그릴 때의 펼침면 상태에서 시작한다(애니메이션 없이).
  const progress = useRef<number[]>(leaves.map((leaf) => (leaf.index < spread ? 1 : 0)));
  const animations = useRef<TurnAnimation[]>(
    leaves.map((leaf) => {
      const value = leaf.index < spread ? 1 : 0;
      return { from: value, to: value, start: 0, duration: 0 };
    }),
  );
  const shownSpread = useRef(spread);
  const settled = useRef(true);
  const drag = useRef<PageDrag | null>(null);
  const hover = useRef<EdgeHover | null>(null);
  const lifted = useRef<EdgeHover & { amount: number }>({ leaf: -1, direction: 1, amount: 0 });
  const [cursor, setCursor] = useState<'grab' | 'grabbing' | 'pointer' | null>(null);

  // 펼침면이 바뀌면 그 사이의 장들을 차례로 넘긴다.
  useEffect(() => {
    const from = shownSpread.current;
    shownSpread.current = spread;
    if (from === spread) return;
    const forward = spread > from;
    const order = forward ? range(from, spread) : range(spread, from).toReversed();
    const now = clock.elapsedTime;
    order.forEach((leafIndex, n) => {
      const animation = animations.current[leafIndex];
      if (!animation) return;
      animation.from = progress.current[leafIndex] ?? 0;
      animation.to = forward ? 1 : 0;
      animation.start = now + n * TURN_STAGGER;
      animation.duration = Math.max(0.3, Math.abs(animation.to - animation.from) * TURN_DURATION);
      playPageTurn(n * TURN_STAGGER);
    });
  }, [spread, clock]);

  useFrame((_, delta) => {
    const now = clock.elapsedTime;
    const dragging = drag.current?.active ? drag.current : null;
    let allSettled = !dragging;

    // 가장자리 들림은 부드럽게 들어갔다 나온다.
    const target = hover.current && !dragging && settled.current ? hover.current : null;
    if (target && (target.leaf !== lifted.current.leaf || lifted.current.amount < 0.01)) {
      lifted.current.leaf = target.leaf;
      lifted.current.direction = target.direction;
    }
    lifted.current.amount = damp(
      lifted.current.amount,
      target && target.leaf === lifted.current.leaf ? 1 : 0,
      12,
      delta,
    );

    leaves.forEach((leaf, i) => {
      const animation = animations.current[i]!;
      let p: number;
      let direction = animation.to >= animation.from ? 1 : -1;
      if (dragging?.leaf === i) {
        p = dragging.progress;
        direction = dragging.direction;
      } else {
        const k =
          animation.duration > 0 ? clamp((now - animation.start) / animation.duration, 0, 1) : 1;
        if (k < 1) allSettled = false;
        p = animation.from + (animation.to - animation.from) * easeInOutCubic(k);
      }
      progress.current[i] = p;
      const rig = rigs.current[i];
      if (!rig) return;
      const lift = lifted.current.leaf === i ? lifted.current.direction * lifted.current.amount : 0;
      poseLeaf(rig, leaf, stack, p, direction, lift);
    });

    if (allSettled !== settled.current) {
      settled.current = allSettled;
      setSettled(allSettled);
    }
  });

  const bookX = useCallback(
    (clientX: number, clientY: number, y: number) =>
      screenToBookX(gl.domElement, camera, clientX, clientY, y),
    [gl, camera],
  );

  /** 누른 곳이 책장 가장자리(끌어서 넘길 수 있는 곳)인지 */
  const edgeAt = useCallback(
    (x: number): (EdgeHover & { width: number }) | null => {
      const { spread: current, settled: resting } = bookStore.getState();
      if (!resting) return null;
      const right = leaves[current];
      const left = leaves[current - 1];
      if (x > 0 && right) {
        const width = right.cover ? COVER_WIDTH : PAGE_WIDTH;
        if (x > width * (1 - DRAG_EDGE)) return { leaf: current, direction: 1, width };
      }
      if (x < 0 && left) {
        const width = left.cover ? COVER_WIDTH : PAGE_WIDTH;
        if (x < -width * (1 - DRAG_EDGE)) return { leaf: current - 1, direction: -1, width };
      }
      return null;
    },
    [leaves],
  );

  // 끌기는 책 밖으로 나가도 이어지도록 창 전체에서 받는다.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const current = drag.current;
      if (!current) return;
      if (!current.active) {
        const moved = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
        if (moved < DRAG_THRESHOLD_PX) return;
        current.active = true;
        bookStore.getState().setDragging(true);
        setCursor('grabbing');
      }
      const x = bookX(event.clientX, event.clientY, current.surfaceY);
      if (x === null) return;
      current.progress = clamp(Math.acos(clamp(x / current.width, -1, 1)) / Math.PI, 0.002, 0.998);
    };
    const onUp = () => {
      const current = drag.current;
      if (!current) return;
      drag.current = null;
      setControlsEnabled(controlsRef.current, true);
      setCursor(null);
      if (!current.active) return;
      const store = bookStore.getState();
      store.setDragging(false);
      progress.current[current.leaf] = current.progress;
      const turned =
        current.direction > 0 ? current.progress > DRAG_COMMIT : current.progress < 1 - DRAG_COMMIT;
      if (turned) {
        // 펼침면을 바꾸면 위의 효과가 지금 자리에서 끝까지 넘기는 애니메이션을 만든다.
        store.goTo(store.spread + current.direction);
        return;
      }
      const animation = animations.current[current.leaf]!;
      animation.from = current.progress;
      animation.to = current.direction > 0 ? 0 : 1;
      animation.start = clock.elapsedTime;
      animation.duration = Math.max(0.25, Math.abs(animation.to - animation.from) * TURN_DURATION);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [bookX, clock]);

  useEffect(() => {
    if (!cursor) return;
    document.body.style.cursor = cursor;
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [cursor]);

  const closed = spread === 0 || spread === leaves.length;

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (drag.current?.active) return;
    const edge = edgeAt(event.point.x);
    hover.current = edge ? { leaf: edge.leaf, direction: edge.direction } : null;
    setCursor(edge ? 'grab' : closed ? 'pointer' : null);
  };
  const onPointerOut = () => {
    hover.current = null;
    if (!drag.current) setCursor(null);
  };
  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    const edge = edgeAt(event.point.x);
    if (!edge) return;
    // 책장을 잡으면 카메라 회전은 잠시 멈춘다.
    setControlsEnabled(controlsRef.current, false);
    drag.current = {
      ...edge,
      surfaceY: event.point.y,
      startX: event.nativeEvent.clientX,
      startY: event.nativeEvent.clientY,
      active: false,
      progress: edge.direction > 0 ? 0 : 1,
    };
  };

  const register = useCallback((index: number, rig: LeafRig | null) => {
    rigs.current[index] = rig;
  }, []);
  const runtime = useMemo(() => ({ progress }), []);

  return (
    <BookRuntimeContext value={runtime}>
      <group
        onClick={(event) => {
          // 닫힌 책은 눌러서 펼친다.
          if (!closed) return;
          event.stopPropagation();
          const { next, goTo } = bookStore.getState();
          if (spread === 0) next();
          else goTo(0);
        }}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
        onPointerDown={onPointerDown}
      >
        {leaves.map((leaf) => (
          <BookLeaf
            key={leaf.index}
            leaf={leaf}
            near={isNear(leaf.index, spread) || isNear(leaf.index, restingSpread)}
            register={register}
          />
        ))}
        <Spine stack={stack} progress={progress} lastIndex={leaves.length - 1} />
      </group>
      {book.pages.map((page, index) =>
        page.scene && Math.abs(index / 2 - spread) <= 1 ? (
          <PopupSlot
            key={page.id}
            page={page}
            spreadIndex={index / 2}
            y={stack.right[index / 2]! + stack.thickness[index / 2]! / 2}
          />
        ) : null,
      )}
      <SpreadOverlays stack={stack} />
    </BookRuntimeContext>
  );
}

/** 펼침면 s 에서 보이거나 곧 보일 장인지 (앞면은 s = i, 뒷면은 s = i + 1 에서 보인다) */
function isNear(leafIndex: number, spread: number): boolean {
  return spread >= leafIndex - 1 && spread <= leafIndex + 2;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

/** 앞뒤 표지를 잇는 책등. 책을 펼치면 납작해져 책 밑에 깔린다. */
function Spine({
  stack,
  progress,
  lastIndex,
}: {
  stack: Stack;
  progress: RefObject<number[]>;
  lastIndex: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!mesh.current) return;
    const front = lerp(stack.right[0]!, stack.left[0]!, progress.current[0] ?? 0);
    const back = lerp(
      stack.right[lastIndex]!,
      stack.left[lastIndex]!,
      progress.current[lastIndex] ?? 0,
    );
    const top = Math.max(front, back) + COVER_DEPTH / 2;
    const bottom = Math.min(front, back) - COVER_DEPTH / 2;
    mesh.current.scale.y = Math.max(0.0001, top - bottom);
    mesh.current.position.y = (top + bottom) / 2;
  });
  return (
    <mesh ref={mesh} position-x={-COVER_DEPTH / 2} castShadow receiveShadow>
      <boxGeometry args={[COVER_DEPTH, 1, COVER_HEIGHT]} />
      <meshStandardMaterial color={COLORS.clothDark} roughness={0.8} />
    </mesh>
  );
}

/** 장면이 가장 높이 올라가는 높이(색 번짐이 이 높이까지 차오른다) */
const SCENE_TOP = 0.75;

/**
 * 오른쪽 페이지의 팝업 장면.
 * 1) 왼쪽 장이 내려앉아 페이지가 펼쳐지면(openness) 도면이 페이지에 인쇄된 상태가 되고,
 * 2) 이어서 등장 시간(reveal)이 흐르며 각 부분이 차례로 일어서고 아래부터 색이 번진다.
 * 3) 오른쪽 장이 들리기 시작하면 장면 전체가 다시 페이지로 접혀 눕는다.
 */
function PopupSlot({ page, spreadIndex, y }: { page: PageSpec; spreadIndex: number; y: number }) {
  const { progress } = useBookRuntime();
  const group = useRef<THREE.Group>(null);
  const openness = useRef(0);
  const reveal = useRef(0);

  useFrame((_, delta) => {
    const leftLeaf = progress.current[spreadIndex - 1] ?? 1;
    const rightLeaf = progress.current[spreadIndex] ?? 0;
    const value = smoothstep(leftLeaf, 0.75, 1) * (1 - smoothstep(rightLeaf, 0, 0.3));
    openness.current = value;
    if (value > 0.999) {
      if (reveal.current === 0) playPop();
      reveal.current = Math.min(1, reveal.current + delta / REVEAL_DURATION);
    } else if (value < 0.02) {
      reveal.current = 0;
    }
    if (!group.current) return;
    group.current.visible = value > 0.002;
    group.current.scale.y = Math.max(0.002, value);
    if (group.current.visible) {
      const fill = smoothstep(reveal.current, 0.2, 0.95);
      inkUniforms.uFillY.value = lerp(y - 0.03, y + SCENE_TOP, fill);
    }
  });

  const scene = useMemo<SceneRuntime>(
    () => ({ lessonId: page.lessonId ?? page.id, openness, reveal }),
    [page],
  );
  const Scene = page.scene;
  if (!Scene) return null;
  return (
    <group position={[PAGE_WIDTH / 2, y, 0]}>
      <group ref={group}>
        <SceneContext value={scene}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </SceneContext>
      </group>
    </group>
  );
}
