import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import type * as THREE from 'three';
import { InkLines } from '../../../ink/Ink.tsx';
import { inkMaterial } from '../../../ink/inkMaterial.ts';
import { useLessonGate } from '../../../scene/gate.ts';
import { Label } from '../../../scene/Label.tsx';
import { TINT } from '../../../scene/palette.ts';
import { PopUp } from '../../../scene/PopUp.tsx';
import { SceneButton } from '../../../scene/SceneButton.tsx';
import { LAUNCH_RADIUS, simulateLaunch } from './physics.ts';
import { ORBIT_QUESTION } from './ids.ts';

const CENTER: [number, number, number] = [0.02, 0.31, -0.06];
/** 행성 반지름(장면 단위). 계산 단위(반지름 1)를 이만큼 줄여 그린다. */
const RADIUS = 0.15;
/** 계산 시간 → 화면 시간: 원 궤도 한 바퀴를 약 4초에 보여 준다. */
const TIME_SCALE = 2.1;
const SAMPLE_DT = 0.002 * 8;

const SHOTS = [
  { id: 'slow', label: '느리게', ratio: 0.55, color: TINT.red },
  { id: 'fast', label: '빠르게', ratio: 0.82, color: TINT.yellow },
  { id: 'orbit', label: '7.9 km/s', ratio: 1, color: TINT.green },
  { id: 'faster', label: '더 빠르게', ratio: 1.1, color: TINT.purple },
] as const;

type ShotId = (typeof SHOTS)[number]['id'];

interface Trajectory {
  outcome: 'crash' | 'orbit';
  /** 장면 좌표로 바꾼 궤적 */
  scene: [number, number, number][];
}

function toScene(point: { x: number; y: number }): [number, number, number] {
  return [CENTER[0] + point.x * RADIUS, CENTER[1] + point.y * RADIUS, CENTER[2]];
}

/** 산꼭대기의 대포. 빠르게 쏠수록 멀리 떨어지다가, 어느 속력부터는 땅에 닿지 않고 돈다. */
export function OrbitScene() {
  const { allow } = useLessonGate(ORBIT_QUESTION);
  const [fired, setFired] = useState<ShotId[]>([]);
  const [finished, setFinished] = useState<ShotId[]>([]);
  const launches = useMemo(() => {
    const result = new Map<ShotId, Trajectory>();
    for (const shot of SHOTS) {
      const launch = simulateLaunch(shot.ratio);
      result.set(shot.id, { outcome: launch.outcome, scene: launch.points.map(toScene) });
    }
    return result;
  }, []);

  const clocks = useRef(new Map<ShotId, number>());
  const lines = useRef(new Map<ShotId, ComponentRef<typeof Line>>());
  const balls = useRef(new Map<ShotId, THREE.Mesh>());

  useFrame((_, delta) => {
    for (const id of fired) {
      const launch = launches.get(id);
      if (!launch) continue;
      const elapsed = (clocks.current.get(id) ?? 0) + delta;
      clocks.current.set(id, elapsed);
      const total = launch.scene.length - 1;
      const reached = (elapsed * TIME_SCALE) / SAMPLE_DT;
      const index = launch.outcome === 'orbit' ? reached % total : Math.min(total, reached);
      const shown = launch.outcome === 'orbit' ? Math.min(total, reached) : index;
      const line = lines.current.get(id);
      if (line) {
        (line.geometry as THREE.InstancedBufferGeometry).instanceCount = Math.max(
          1,
          Math.floor(shown),
        );
      }
      const ball = balls.current.get(id);
      const point = launch.scene[Math.floor(index)];
      if (ball && point) ball.position.set(...point);
      if (reached >= total && !finished.includes(id)) setFinished((current) => [...current, id]);
    }
  });

  const fire = (id: ShotId) => () => {
    if (!allow()) return;
    clocks.current.set(id, 0);
    setFinished((current) => current.filter((other) => other !== id));
    setFired((current) => (current.includes(id) ? current : [...current, id]));
  };
  const clear = () => {
    if (!allow()) return;
    clocks.current.clear();
    setFired([]);
    setFinished([]);
  };

  const top = CENTER[1] + RADIUS;
  return (
    <group>
      {/* 지구본 받침 (궤도 뒤쪽에 서 있다) */}
      <PopUp at={0}>
        <mesh
          position={[CENTER[0], 0.008, CENTER[2] - 0.13]}
          material={inkMaterial(TINT.wood)}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.09, 0.1, 0.016, 40]} />
          <InkLines />
        </mesh>
        <mesh
          position={[CENTER[0], CENTER[1] / 2, CENTER[2] - 0.13]}
          material={inkMaterial(TINT.brass)}
          castShadow
        >
          <cylinderGeometry args={[0.008, 0.008, CENTER[1], 12]} />
          <InkLines edges={false} />
        </mesh>
        <mesh
          position={[CENTER[0], CENTER[1], CENTER[2] - 0.09]}
          rotation-x={Math.PI / 2}
          material={inkMaterial(TINT.brass)}
        >
          <cylinderGeometry args={[0.007, 0.007, 0.08, 12]} />
          <InkLines edges={false} />
        </mesh>
      </PopUp>

      {/* 지구 */}
      <PopUp at={0.1} span={0.32}>
        <mesh position={CENTER} material={inkMaterial(TINT.sky)} castShadow>
          <sphereGeometry args={[RADIUS, 48, 32]} />
          <InkLines edges={false} />
        </mesh>
        {[0, Math.PI / 3, -Math.PI / 3].map((turn) => (
          <mesh key={turn} position={CENTER} rotation={[0, turn, 0]}>
            <torusGeometry args={[RADIUS * 1.003, 0.0016, 6, 64]} />
            <meshBasicMaterial color={TINT.ink} />
          </mesh>
        ))}
        <mesh position={CENTER} rotation-x={Math.PI / 2}>
          <torusGeometry args={[RADIUS * 1.003, 0.0016, 6, 64]} />
          <meshBasicMaterial color={TINT.ink} />
        </mesh>
      </PopUp>

      {/* 산과 대포 (산 높이는 과장했다) */}
      <PopUp at={0.3} mode="grow" span={0.2} position={[CENTER[0], top, CENTER[2]]}>
        <mesh
          position={[0, (LAUNCH_RADIUS - 1) * RADIUS * 0.45, 0]}
          material={inkMaterial(TINT.green)}
          castShadow
        >
          <coneGeometry args={[0.06, (LAUNCH_RADIUS - 1) * RADIUS * 1.05, 24]} />
          <InkLines />
        </mesh>
        <mesh
          position={[0.012, (LAUNCH_RADIUS - 1) * RADIUS + 0.004, 0]}
          rotation-z={-Math.PI / 2}
          material={inkMaterial(TINT.steel)}
          castShadow
        >
          <cylinderGeometry args={[0.009, 0.012, 0.05, 16]} />
          <InkLines edges={false} />
        </mesh>
      </PopUp>

      {/* 발사한 대포알과 지나간 자리 */}
      {SHOTS.filter((shot) => fired.includes(shot.id)).map((shot) => {
        const launch = launches.get(shot.id);
        if (!launch) return null;
        const end = launch.scene.at(-1)!;
        return (
          <group key={shot.id}>
            <Line
              ref={(line) => {
                if (line) lines.current.set(shot.id, line);
                else lines.current.delete(shot.id);
              }}
              points={launch.scene}
              color={shot.color}
              lineWidth={2.6}
              dashed
              dashSize={0.012}
              gapSize={0.007}
            />
            <mesh
              ref={(mesh) => {
                if (mesh) balls.current.set(shot.id, mesh);
                else balls.current.delete(shot.id);
              }}
              position={launch.scene[0]}
              material={inkMaterial(shot.color)}
            >
              <sphereGeometry args={[0.011, 16, 12]} />
              <InkLines edges={false} width={1} />
            </mesh>
            {finished.includes(shot.id) && (
              <Label
                text={launch.outcome === 'crash' ? '떨어짐' : '계속 돎'}
                height={0.034}
                color={launch.outcome === 'crash' ? TINT.ink : TINT.accent}
                position={
                  launch.outcome === 'crash'
                    ? [end[0] * 1.08, end[1] + 0.03, end[2] + 0.02]
                    : [
                        CENTER[0] + (shot.ratio > 1 ? 0.27 : 0.2),
                        CENTER[1] - 0.06,
                        CENTER[2] + 0.02,
                      ]
                }
              />
            )}
          </group>
        );
      })}

      {SHOTS.map((shot, index) => (
        <SceneButton
          key={shot.id}
          id={`fire-${shot.id}`}
          label={shot.label}
          position={[-0.38 + index * 0.19, 0, 0.36]}
          active={fired.includes(shot.id)}
          onPress={fire(shot.id)}
          at={0.72 + index * 0.04}
        />
      ))}
      <SceneButton id="clear" label="지우기" position={[0.38, 0, 0.36]} onPress={clear} at={0.9} />
    </group>
  );
}
