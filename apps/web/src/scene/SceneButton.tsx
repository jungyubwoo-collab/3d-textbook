import { useCursor } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { COLORS } from '../book/constants.ts';
import { useSceneRuntime } from '../book/runtime.ts';
import { InkLines } from '../ink/Ink.tsx';
import { inkMaterial } from '../ink/inkMaterial.ts';
import { registerAction } from '../lib/capture.ts';
import { playSound } from '../lib/sound.ts';
import { createTextTexture, fitFontSize, fontOf } from './canvasText.ts';
import { PopUp } from './PopUp.tsx';
import { TINT } from './palette.ts';

const HEIGHT = 0.022;
const DEPTH = 0.058;

interface SceneButtonProps {
  /** 녹화 스크립트에서 부르는 이름. `${lessonId}:${id}`로 등록된다. */
  id: string;
  label: string;
  position: [number, number, number];
  width?: number;
  /** 켜진 상태(고른 단추)는 주황색으로 칠한다. */
  active?: boolean;
  disabled?: boolean;
  /** 등장 시간 중 튀어나오는 때 */
  at?: number;
  onPress: () => void;
}

/** 페이지 위에 서는 3D 단추. 윗면에 글자가 인쇄되어 있고 누르면 쑥 들어간다. */
export function SceneButton({
  id,
  label,
  position,
  width = 0.16,
  active = false,
  disabled = false,
  at = 0.78,
  onPress,
}: SceneButtonProps) {
  const scene = useSceneRuntime();
  const body = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const press = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !disabled);

  const top = useMemo(() => {
    const texture = createTextTexture(
      512,
      (512 * DEPTH) / width,
      (ctx, w, h) => {
        ctx.fillStyle = disabled ? '#e7e1d4' : active ? COLORS.accent : TINT.card;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, w - 10, h - 10);
        const size = fitFontSize(ctx, label, 800, h * 0.52, w * 0.84);
        ctx.font = fontOf(800, size);
        ctx.fillStyle = disabled ? '#a39a8c' : active ? '#ffffff' : COLORS.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, w / 2, h / 2 + size * 0.04);
      },
      label,
    );
    return new THREE.MeshToonMaterial({ map: texture });
  }, [label, width, active, disabled]);
  useEffect(
    () => () => {
      top.map?.dispose();
      top.dispose();
    },
    [top],
  );

  const materials = useMemo(() => {
    const side = inkMaterial(active ? TINT.orange : TINT.card);
    return [side, side, top, side, side, side];
  }, [active, top]);

  const trigger = () => {
    if (disabled) return;
    press.current = 1;
    playSound('tap');
    onPress();
  };
  const triggerRef = useRef(trigger);
  useEffect(() => {
    triggerRef.current = trigger;
  });
  useEffect(
    () =>
      registerAction(
        `${scene.lessonId}:${id}`,
        () => triggerRef.current(),
        () => {
          if (!mesh.current) return null;
          const point = mesh.current.getWorldPosition(new THREE.Vector3());
          return [point.x, point.y + HEIGHT / 2, point.z];
        },
      ),
    [scene.lessonId, id],
  );

  useFrame((_, delta) => {
    press.current = Math.max(0, press.current - delta * 5);
    if (body.current) {
      body.current.position.y = (hovered && !disabled ? 0.004 : 0) - press.current * 0.012;
    }
  });

  return (
    <PopUp at={at} mode="grow" span={0.16} position={position}>
      <group ref={body}>
        <mesh
          ref={mesh}
          position={[0, HEIGHT / 2, 0]}
          material={materials}
          castShadow
          receiveShadow
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(event) => {
            event.stopPropagation();
            trigger();
          }}
        >
          <boxGeometry args={[width, HEIGHT, DEPTH]} />
          <InkLines outline={false} width={1.2} />
        </mesh>
      </group>
    </PopUp>
  );
}
