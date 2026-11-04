import { useCursor } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { book } from '../content/book.ts';
import { describeStats, recordPrediction } from '../lib/api.ts';
import { registerAction } from '../lib/capture.ts';
import { getLearnerId } from '../lib/learner.ts';
import { answerKey, bookStore, useBookStore } from '../state/bookStore.ts';
import { COLORS, PAGE_HEIGHT } from './constants.ts';
import { drawFlapFace, getStampCanvas, STAMP_ROTATION } from './paint.ts';
import { pageRectToBook, surfaceHeights, type Stack } from './stack.ts';
import { pagesOfSpread, spreadOfPage } from './structure.ts';
import type { Rect } from './typeset.ts';
import type { PageSpec, Question } from './types.ts';
import { getPageLayout, usePageAnswers, type PageSide } from './usePageAsset.ts';

/** 덮개를 연 각도(라디안). 아래쪽 경첩을 축으로 독자 쪽으로 젖혀 눕힌다. */
const FLAP_OPEN_ANGLE = 2.92;

/** 책장이 멈춰 있을 때, 펼친 두 페이지 위에 누를 수 있는 영역과 덮개를 올린다. */
export function SpreadOverlays({ stack }: { stack: Stack }) {
  const spread = useBookStore((state) => state.spread);
  const settled = useBookStore((state) => state.settled);
  if (!settled) return null;
  const { left, right } = pagesOfSpread(book.pages, spread);
  const heights = surfaceHeights(stack, spread);
  return (
    <>
      {heights.left !== undefined && heights.right !== undefined && (
        <GutterShade y={Math.max(heights.left, heights.right) + 0.0004} />
      )}
      {left && heights.left !== undefined && (
        <PageOverlay key={left.id} page={left} side="left" y={heights.left} />
      )}
      {right && heights.right !== undefined && (
        <PageOverlay key={right.id} page={right} side="right" y={heights.right} />
      )}
    </>
  );
}

function PageOverlay({ page, side, y }: { page: PageSpec; side: PageSide; y: number }) {
  const layout = getPageLayout(page, side);
  const answers = usePageAnswers(page);
  const lessonId = page.lessonId ?? '';
  const questions = useMemo(
    () =>
      new Map<string, Question>(
        page.blocks.flatMap((block) =>
          block.type === 'question' ? [[block.question.id, block.question]] : [],
        ),
      ),
    [page],
  );

  /** 덮개를 누름. 열렸으면 true, 아직 보기를 안 골라 잠겨 있으면 false */
  const openFlap = useCallback(
    (questionId: string): boolean => {
      const store = bookStore.getState();
      const key = answerKey(lessonId, questionId);
      const answer = store.answers[key];
      const question = questions.get(questionId);
      if (!answer || !question) {
        store.showToast('먼저 보기에서 예측을 골라 주세요.');
        return false;
      }
      const correct = answer.choiceId === question.answerId;
      if (!store.reveal(key, correct)) return true;
      const feedback = correct
        ? '정답이에요! 도장을 받았어요.'
        : '아쉬워요. 해설을 읽고 실험으로 확인해 보세요.';
      store.showToast(feedback);
      void recordPrediction({
        learnerId: getLearnerId(),
        lessonId,
        questionId,
        choiceId: answer.choiceId,
        isCorrect: correct,
      }).then((stats) => {
        if (stats) bookStore.getState().showToast(`${feedback} ${describeStats(stats)}`);
      });
      return true;
    },
    [lessonId, questions],
  );

  // 보기·덮개·차례를 이름으로도 누를 수 있게 한다(시연 영상 녹화 스크립트용).
  useEffect(() => {
    const at = (rect: Rect) => (): [number, number, number] => {
      const area = pageRectToBook(rect, side);
      return [area.x, y, area.z];
    };
    const cleanups = layout.regions.flatMap((region) => {
      switch (region.kind) {
        case 'choice':
          return [
            registerAction(
              `${lessonId}:choice:${region.questionId}:${region.choiceId}`,
              () =>
                bookStore
                  .getState()
                  .choose(answerKey(lessonId, region.questionId), region.choiceId),
              at(region.rect),
            ),
          ];
        case 'answer':
          return [
            registerAction(
              `${lessonId}:flap:${region.questionId}`,
              () => void openFlap(region.questionId),
              at(region.rect),
            ),
          ];
        case 'link':
          return [
            registerAction(
              `toc:${region.pageId}`,
              () => bookStore.getState().goTo(spreadOfPage(book.pages, region.pageId)),
              at(region.rect),
            ),
          ];
        case 'stamp':
          return [];
      }
    });
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [layout, lessonId, side, y, openFlap]);

  return (
    <group>
      {layout.regions.map((region, index) => {
        switch (region.kind) {
          case 'choice':
            return (
              <HitArea
                key={index}
                rect={region.rect}
                side={side}
                y={y}
                disabled={answers[region.questionId]?.revealed ?? false}
                onSelect={() =>
                  bookStore
                    .getState()
                    .choose(answerKey(lessonId, region.questionId), region.choiceId)
                }
              />
            );
          case 'link':
            return (
              <HitArea
                key={index}
                rect={region.rect}
                side={side}
                y={y}
                onSelect={() => bookStore.getState().goTo(spreadOfPage(book.pages, region.pageId))}
              />
            );
          case 'answer':
            return (
              <Flap
                key={index}
                rect={region.rect}
                side={side}
                y={y}
                revealed={answers[region.questionId]?.revealed ?? false}
                onOpen={() => openFlap(region.questionId)}
              />
            );
          case 'stamp':
            return answers[region.questionId]?.stampPending ? (
              <StampEffect
                key={index}
                center={{ x: region.x, y: region.y }}
                radius={region.radius}
                side={side}
                y={y}
                onDone={() =>
                  bookStore.getState().settleStamp(answerKey(lessonId, region.questionId))
                }
              />
            ) : null;
        }
      })}
    </group>
  );
}

/** 책 가운데 접히는 곳의 그늘. 책장 더미의 가장자리가 비쳐 보이는 것도 가린다. */
function GutterShade({ y }: { y: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 4;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, 'rgba(60, 42, 20, 0)');
      gradient.addColorStop(0.5, 'rgba(60, 42, 20, 0.34)');
      gradient.addColorStop(1, 'rgba(60, 42, 20, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, y, 0]} rotation-x={-Math.PI / 2} renderOrder={1}>
      <planeGeometry args={[0.07, PAGE_HEIGHT]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function useHover(enabled: boolean) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && enabled);
  return {
    hovered,
    handlers: {
      onPointerOver: (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setHovered(true);
      },
      onPointerOut: () => setHovered(false),
    },
  };
}

/** 페이지에 인쇄된 보기·차례 항목 위의 투명한 단추 */
function HitArea({
  rect,
  side,
  y,
  disabled = false,
  onSelect,
}: {
  rect: Rect;
  side: PageSide;
  y: number;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const area = pageRectToBook(rect, side);
  const { hovered, handlers } = useHover(!disabled);
  return (
    <mesh
      position={[area.x, y + 0.0011, area.z]}
      rotation-x={-Math.PI / 2}
      {...handlers}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onSelect();
      }}
    >
      <planeGeometry args={[area.w, area.h]} />
      <meshBasicMaterial
        color={COLORS.accent}
        transparent
        opacity={hovered && !disabled ? 0.09 : 0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** 정답을 가린 종이 덮개. 아래쪽 경첩을 축으로 들춘다. */
function Flap({
  rect,
  side,
  y,
  revealed,
  onOpen,
}: {
  rect: Rect;
  side: PageSide;
  y: number;
  revealed: boolean;
  onOpen: () => boolean;
}) {
  const area = pageRectToBook(rect, side);
  const hinge = useRef<THREE.Group>(null);
  const angle = useRef(revealed ? FLAP_OPEN_ANGLE : 0);
  const shake = useRef(0);
  const { handlers } = useHover(!revealed);

  const materials = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(rect.w);
    canvas.height = Math.round(rect.h);
    const context = canvas.getContext('2d');
    if (context) drawFlapFace(context, canvas.width, canvas.height, false);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const edge = new THREE.MeshStandardMaterial({ color: COLORS.flapEdge, roughness: 0.9 });
    const top = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
    const bottom = new THREE.MeshStandardMaterial({ color: COLORS.flap, roughness: 0.9 });
    return [edge, edge, top, bottom, edge, edge];
  }, [rect.w, rect.h]);
  useEffect(
    () => () => {
      for (const material of new Set(materials)) {
        material.map?.dispose();
        material.dispose();
      }
    },
    [materials],
  );

  useFrame((_, delta) => {
    if (!hinge.current) return;
    angle.current = THREE.MathUtils.damp(angle.current, revealed ? FLAP_OPEN_ANGLE : 0, 7, delta);
    shake.current = Math.max(0, shake.current - delta);
    const wiggle = Math.sin(shake.current * 50) * 0.12 * shake.current;
    hinge.current.rotation.x = angle.current + wiggle;
  });

  return (
    <group ref={hinge} position={[area.x, y + 0.0009, area.z + area.h / 2]}>
      <mesh
        position={[0, 0.0008, -area.h / 2]}
        material={materials}
        castShadow
        receiveShadow
        {...handlers}
        onClick={(event) => {
          event.stopPropagation();
          if (!revealed && !onOpen()) shake.current = 0.45;
        }}
      >
        <boxGeometry args={[area.w, 0.0016, area.h]} />
      </mesh>
    </group>
  );
}

/** "참 잘했어요" 도장이 위에서 쿵 찍히는 효과. 끝나면 페이지 텍스처에 도장을 넘긴다. */
function StampEffect({
  center,
  radius,
  side,
  y,
  onDone,
}: {
  center: { x: number; y: number };
  radius: number;
  side: PageSide;
  y: number;
  onDone: () => void;
}) {
  const area = pageRectToBook(
    { x: center.x - radius, y: center.y - radius, w: radius * 2, h: radius * 2 },
    side,
  );
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const elapsed = useRef(0);
  const finished = useRef(false);
  const texture = useMemo(() => {
    const result = new THREE.CanvasTexture(getStampCanvas());
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const k = THREE.MathUtils.clamp(elapsed.current / 0.3, 0, 1);
    const eased = 1 - (1 - k) ** 3;
    if (mesh.current) {
      mesh.current.scale.setScalar(THREE.MathUtils.lerp(1.9, 1, eased));
      mesh.current.position.y = y + 0.0016 + (1 - eased) * 0.14;
    }
    if (material.current) material.current.opacity = Math.min(1, k * 1.5);
    if (!finished.current && elapsed.current > 0.75) {
      finished.current = true;
      onDone();
    }
  });

  return (
    <mesh
      ref={mesh}
      position={[area.x, y + 0.14, area.z]}
      rotation={[-Math.PI / 2, 0, -STAMP_ROTATION]}
    >
      <planeGeometry args={[area.w, area.h]} />
      <meshStandardMaterial
        ref={material}
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        roughness={0.9}
      />
    </mesh>
  );
}
