import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { InkLines } from '../ink/Ink.tsx';
import { glassMaterial, inkMaterial } from '../ink/inkMaterial.ts';
import { Label } from './Label.tsx';
import { PopUp } from './PopUp.tsx';
import { TINT } from './palette.ts';

export interface BarSpec {
  label: string;
  color: string;
}

interface BarsProps {
  position: [number, number, number];
  bars: BarSpec[];
  /** 매 프레임 부르는 값 읽기. bars와 같은 순서 */
  getValues: () => number[];
  /** 막대가 꽉 차는 값 */
  max: number;
  /** 꽉 찬 막대의 높이 */
  height?: number;
  at?: number;
}

const WIDTH = 0.042;
const DEPTH = 0.042;
const GAP = 0.02;

/** 에너지·운동량 같은 양을 막대 높이로 보여 주는 유리 눈금 기둥들 */
export function Bars({ position, bars, getValues, max, height = 0.26, at = 0.45 }: BarsProps) {
  const fills = useRef<(THREE.Mesh | null)[]>([]);
  const column = useMemo(() => {
    const geometry = new THREE.BoxGeometry(WIDTH * 0.78, 1, DEPTH * 0.78);
    geometry.translate(0, 0.5, 0);
    return geometry;
  }, []);
  useEffect(() => () => column.dispose(), [column]);

  useFrame(() => {
    const values = getValues();
    fills.current.forEach((mesh, index) => {
      if (!mesh) return;
      const ratio = Math.min(1.02, Math.max(0, (values[index] ?? 0) / max));
      mesh.scale.y = Math.max(0.0005, ratio * height);
      mesh.visible = ratio > 0.002;
    });
  });

  const span = bars.length * WIDTH + (bars.length - 1) * GAP;
  return (
    <group position={position}>
      <PopUp at={at}>
        <mesh position={[0, 0.006, 0]} material={inkMaterial(TINT.wood)} receiveShadow castShadow>
          <boxGeometry args={[span + 0.04, 0.012, DEPTH + 0.04]} />
          <InkLines />
        </mesh>
        {bars.map((bar, index) => {
          const x = -span / 2 + WIDTH / 2 + index * (WIDTH + GAP);
          return (
            <group key={bar.label} position={[x, 0.012, 0]}>
              <mesh
                ref={(mesh) => {
                  fills.current[index] = mesh;
                }}
                geometry={column}
                material={inkMaterial(bar.color)}
                castShadow
              >
                <InkLines outline={false} width={1} />
              </mesh>
              <mesh position={[0, height / 2, 0]} material={glassMaterial}>
                <boxGeometry args={[WIDTH, height, DEPTH]} />
                {/* 투명한 유리에는 윤곽선 껍질이 비쳐 보이므로 모서리 선만 긋는다. */}
                <InkLines outline={false} width={1} threshold={30} />
              </mesh>
            </group>
          );
        })}
      </PopUp>
      {bars.map((bar, index) => (
        <PopUp
          key={bar.label}
          at={at + 0.25}
          mode="grow"
          span={0.15}
          position={[-span / 2 + WIDTH / 2 + index * (WIDTH + GAP), 0.035, DEPTH / 2 + 0.035]}
        >
          <Label text={bar.label} height={0.036} />
        </PopUp>
      ))}
    </group>
  );
}
