import { useCursor } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { book } from '../content/book.ts';
import { bookStore, useBookStore } from '../state/bookStore.ts';
import { BookLeaf } from './BookLeaf.tsx';
import {
  COLORS,
  COVER_DEPTH,
  COVER_HEIGHT,
  PAGE_WIDTH,
  TURN_CURL,
  TURN_DURATION,
  TURN_LIFT,
  TURN_STAGGER,
} from './constants.ts';
import type { LeafRig } from './leafRig.ts';
import { SpreadOverlays } from './PageOverlays.tsx';
import { BookRuntimeContext, SceneContext, useBookRuntime, type SceneRuntime } from './runtime.ts';
import { computeStack, easeInOutCubic, easeOutBack, type Stack } from './stack.ts';
import { toLeaves } from './structure.ts';
import type { PageSpec } from './types.ts';

interface TurnAnimation {
  from: number;
  to: number;
  start: number;
  duration: number;
}

const { clamp, lerp, smoothstep } = THREE.MathUtils;

/** 책상 위의 책 한 권: 책장, 책등, 팝업 장면, 페이지 위 조작 영역 */
export function Book() {
  const leaves = useMemo(() => toLeaves(book.pages), []);
  const stack = useMemo(() => computeStack(leaves), [leaves]);
  const spread = useBookStore((state) => state.spread);
  const restingSpread = useBookStore((state) => state.restingSpread);
  const setSettled = useBookStore((state) => state.setSettled);
  const clock = useThree((state) => state.clock);

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
    });
  }, [spread, clock]);

  useFrame(() => {
    const now = clock.elapsedTime;
    let allSettled = true;
    leaves.forEach((leaf, i) => {
      const animation = animations.current[i]!;
      const k =
        animation.duration > 0 ? clamp((now - animation.start) / animation.duration, 0, 1) : 1;
      if (k < 1) allSettled = false;
      const p = animation.from + (animation.to - animation.from) * easeInOutCubic(k);
      progress.current[i] = p;

      const rig = rigs.current[i];
      if (!rig) return;
      const turning = Math.sin(p * Math.PI);
      rig.mesh.position.y = lerp(stack.right[i]!, stack.left[i]!, p) + turning * TURN_LIFT;
      rig.bones[0]!.rotation.z = p * Math.PI;
      // 넘기는 쪽으로 종이 끝이 먼저 나가도록 휘게 한다(표지는 휘지 않는다).
      const direction = animation.to >= animation.from ? 1 : -1;
      const curl = leaf.cover ? 0 : (turning * TURN_CURL * direction) / (rig.bones.length - 1);
      for (let j = 1; j < rig.bones.length; j++) rig.bones[j]!.rotation.z = curl;
    });
    if (allSettled !== settled.current) {
      settled.current = allSettled;
      setSettled(allSettled);
    }
  });

  const register = useCallback((index: number, rig: LeafRig | null) => {
    rigs.current[index] = rig;
  }, []);
  const runtime = useMemo(() => ({ progress }), []);

  // 닫힌 책은 눌러서 펼친다.
  const closed = spread === 0 || spread === leaves.length;
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && closed);

  return (
    <BookRuntimeContext value={runtime}>
      <group
        onClick={(event) => {
          if (!closed) return;
          event.stopPropagation();
          const { next, goTo } = bookStore.getState();
          if (spread === 0) next();
          else goTo(0);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
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

/**
 * 오른쪽 페이지에서 일어서는 팝업 장면.
 * 왼쪽 장이 다 넘어와 내려앉을 때 일어서고, 오른쪽 장이 들리기 시작하면 다시 눕는다.
 */
function PopupSlot({ page, spreadIndex, y }: { page: PageSpec; spreadIndex: number; y: number }) {
  const { progress } = useBookRuntime();
  const group = useRef<THREE.Group>(null);
  const openness = useRef(0);

  useFrame(() => {
    const leftLeaf = progress.current[spreadIndex - 1] ?? 1;
    const rightLeaf = progress.current[spreadIndex] ?? 0;
    const value = smoothstep(leftLeaf, 0.72, 1) * (1 - smoothstep(rightLeaf, 0, 0.28));
    openness.current = value;
    if (!group.current) return;
    group.current.visible = value > 0.002;
    group.current.scale.y = Math.max(0.002, easeOutBack(value));
  });

  const scene = useMemo<SceneRuntime>(
    () => ({ lessonId: page.lessonId ?? page.id, openness }),
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
