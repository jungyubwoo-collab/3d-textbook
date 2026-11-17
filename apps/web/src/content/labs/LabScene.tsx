import { Clone, useCursor, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { COLORS } from '../../book/constants.ts';
import { isSceneInteractive, useSceneRuntime } from '../../book/runtime.ts';
import { InkLines } from '../../ink/Ink.tsx';
import { glassMaterial, inkMaterial } from '../../ink/inkMaterial.ts';
import { Label } from '../../scene/Label.tsx';
import { TINT } from '../../scene/palette.ts';
import { PopUp } from '../../scene/PopUp.tsx';
import { SceneButton } from '../../scene/SceneButton.tsx';
import { LABS, type LabConfig } from './labs.ts';
import { modelsOf, modelUrl, type HubModel } from './models.ts';
import {
  assignSlots,
  cubeSpace,
  fitModel,
  parseRoom,
  placementOf,
  type RoomUnit,
  type SlotSpace,
} from './room.ts';

/** 방 1 m가 장면에서 몇 단위인지(방 가로 5.7 m가 페이지 폭에 들어온다) */
const SCALE = 0.15;
/** 방 가운데(바닥)를 놓는 페이지 위아래 자리 */
const ROOM_Z = -0.14;
/** 바닥판 두께(m). 바닥판이 페이지 위에 얹히게 그만큼 올린다. */
const FLOOR = 0.12;
/** 고른 모델을 크게 돌려 보는 받침대의 자리와 그 위 모델의 크기(장면 단위) */
const STAND: [number, number, number] = [-0.3, 0, 0.3];
const STAND_SIZE = 0.2;
const STAND_SPACE = cubeSpace(STAND_SIZE);

/** 가구 한 묶음: 바닥·벽이 먼저 일어서고 가구가 구석부터 차례로 일어선다. */
function RoomUnitView({ unit }: { unit: RoomUnit }) {
  return (
    <PopUp at={unit.at} span={unit.env ? 0.22 : 0.26}>
      <group position-y={FLOOR}>
        {unit.parts.map((part) => (
          <mesh
            key={part.key}
            geometry={part.geometry}
            position={part.position}
            quaternion={part.quaternion}
            scale={part.scale}
            material={part.glass ? glassMaterial : inkMaterial(part.color)}
            castShadow={!part.glass}
            receiveShadow={!part.glass}
          >
            {/* 유리는 윤곽선 껍질이 비치므로 모서리 선만, 칠판 글씨는 선 없이 */}
            {!part.plain && (
              <InkLines outline={!part.glass && !part.small} width={part.small ? 1 : 1.3} />
            )}
          </mesh>
        ))}
      </group>
    </PopUp>
  );
}

/** 모델 하나를 못 받아도 실험실은 그대로 보이게 한다. */
class Safe extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/** 허브 모델의 재질이 어두운 무대에서도 제 색으로 보이게 주변 빛(반사)을 준다. */
function useModelEnvironment(): THREE.Texture {
  const gl = useThree((state) => state.gl);
  const texture = useMemo(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const surroundings = new RoomEnvironment();
    const result = generator.fromScene(surroundings, 0.04).texture;
    surroundings.dispose();
    generator.dispose();
    return result;
  }, [gl]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** 받아 온 모델에 그림자와 주변 빛을 켠다(같은 모델을 여러 번 써도 한 번만 한다). */
function prepare(scene: THREE.Object3D, environment: THREE.Texture): void {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials: unknown[] = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial && material.envMap !== environment) {
        material.envMap = environment;
        material.envMapIntensity = 0.75;
        material.needsUpdate = true;
      }
    }
  });
}

/** 고른 모델 위에 떠서 까딱이는 표시(방 좌표 m) */
function Marker({ y }: { y: number }) {
  const cone = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (cone.current) cone.current.position.y = y + 0.2 + 0.05 * Math.sin(clock.elapsedTime * 4);
  });
  return (
    <mesh ref={cone} position-y={y + 0.2} rotation-x={Math.PI}>
      <coneGeometry args={[0.085, 0.2, 20]} />
      <meshBasicMaterial color={COLORS.accent} toneMapped={false} />
    </mesh>
  );
}

/**
 * 모델을 공간에 맞춰 원점 위에 세운다. 작은 기구도 잘 보이게 실제 크기가 아니라
 * 자리가 내어 주는 공간에 꼭 맞게 키운다.
 */
function ModelBody({
  model,
  space,
  turn,
  environment,
  marked = false,
}: {
  model: HubModel;
  space: Omit<SlotSpace, 'turn'>;
  turn: number;
  environment: THREE.Texture;
  marked?: boolean;
}) {
  const gltf = useGLTF(modelUrl(model));
  const fit = useMemo(() => {
    prepare(gltf.scene, environment);
    gltf.scene.updateMatrixWorld(true);
    return fitModel(new THREE.Box3().setFromObject(gltf.scene), space, turn);
  }, [gltf, environment, space, turn]);
  return (
    <>
      <group rotation-y={THREE.MathUtils.degToRad(turn)}>
        <group position={fit.offset} scale={fit.scale}>
          <Clone object={gltf.scene} />
        </group>
      </group>
      {marked && <Marker y={fit.height} />}
    </>
  );
}

/** 실험대나 선반 위에 놓인 모델. 누르면 받침대에서 크게 볼 수 있다. */
function PlacedModel({
  model,
  slot,
  position,
  at,
  selected,
  environment,
  onSelect,
}: {
  model: HubModel;
  /** 놓인 자리의 이름(SLOT_…) */
  slot: string;
  position: THREE.Vector3;
  at: number;
  selected: boolean;
  environment: THREE.Texture;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const { space, turn } = useMemo(() => placementOf(model, slot), [model, slot]);
  return (
    <PopUp at={at} mode="grow" span={0.16} position={[position.x, position.y + FLOOR, position.z]}>
      <group
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <Safe>
          <Suspense fallback={null}>
            <ModelBody
              model={model}
              space={space}
              turn={turn}
              environment={environment}
              marked={selected}
            />
          </Suspense>
        </Safe>
      </group>
    </PopUp>
  );
}

/** 고른 모델을 받침대 위에서 천천히 돌려 보여 준다. */
function Showcase({
  model,
  caption,
  environment,
}: {
  model: HubModel;
  caption: string;
  environment: THREE.Texture;
}) {
  const turntable = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (turntable.current) turntable.current.rotation.y += delta * 0.6;
  });
  return (
    <>
      <PopUp at={0.7} mode="grow" span={0.18} position={STAND}>
        <mesh position-y={0.012} material={inkMaterial(TINT.wood)} castShadow receiveShadow>
          <cylinderGeometry args={[0.105, 0.115, 0.024, 40]} />
          <InkLines />
        </mesh>
        <group ref={turntable} position-y={0.026}>
          <Safe key={model.id}>
            <Suspense fallback={null}>
              <ModelBody
                model={model}
                space={STAND_SPACE}
                turn={model.turn ?? 0}
                environment={environment}
              />
            </Suspense>
          </Safe>
        </group>
      </PopUp>
      <PopUp
        at={0.76}
        mode="grow"
        span={0.16}
        position={[STAND[0] + 0.02, STAND_SIZE + 0.075, STAND[2]]}
      >
        <Label text={caption} height={0.04} />
      </PopUp>
    </>
  );
}

/** 방 안의 모델들과, 고른 모델을 크게 보는 받침대 */
function Models({ models, slots }: { models: HubModel[]; slots: Map<string, THREE.Vector3> }) {
  const scene = useSceneRuntime();
  const environment = useModelEnvironment();
  const placed = useMemo(() => assignSlots(models, slots.keys()), [models, slots]);
  /** 자리를 얻은 모델만 보여 준다. */
  const shown = useMemo(() => models.filter((model) => placed.has(model.id)), [models, placed]);
  const [selected, setSelected] = useState(0);
  const current = shown[selected % Math.max(1, shown.length)];
  const step = (by: number) => () => {
    if (!isSceneInteractive(scene) || shown.length === 0) return;
    setSelected((value) => (value + by + shown.length) % shown.length);
  };

  return (
    <>
      <group position={[0, 0, ROOM_Z]} scale={SCALE}>
        {shown.map((model, index) => {
          const slot = placed.get(model.id) ?? '';
          const position = slots.get(slot);
          if (!position) return null;
          return (
            <PlacedModel
              key={model.id}
              model={model}
              slot={slot}
              position={position}
              at={0.58 + (0.2 * index) / Math.max(1, shown.length)}
              selected={model === current}
              environment={environment}
              onSelect={() => {
                if (isSceneInteractive(scene)) setSelected(index);
              }}
            />
          );
        })}
      </group>
      {current && (
        <Showcase
          model={current}
          caption={`${(selected % shown.length) + 1}/${shown.length} · ${current.name}`}
          environment={environment}
        />
      )}
      {shown.length > 1 && (
        <>
          <SceneButton
            id="previous"
            label="이전 모델"
            position={[-0.05, 0, 0.24]}
            width={0.2}
            onPress={step(-1)}
            at={0.82}
          />
          <SceneButton
            id="next"
            label="다음 모델"
            position={[0.17, 0, 0.24]}
            width={0.2}
            onPress={step(1)}
            at={0.85}
          />
        </>
      )}
    </>
  );
}

/**
 * 책 끝의 '나의 실험실'. 페이지에 인쇄된 선 스케치가 3D 공간으로 일어선다.
 * 실험대와 선반 위에는 에셋 허브에서 골라 온 주요 모델을 놓고, 고른 모델은 앞의 받침대에서 크게 돌려 본다.
 */
function LabScene({ lab }: { lab: LabConfig }) {
  const gltf = useGLTF(lab.room);
  const room = useMemo(() => parseRoom(gltf.scene), [gltf]);
  const models = useMemo(() => modelsOf(lab.id), [lab.id]);

  return (
    <group>
      <group position={[0, 0, ROOM_Z]} scale={SCALE}>
        {room.units.map((unit) => (
          <RoomUnitView key={unit.name} unit={unit} />
        ))}
      </group>
      <PopUp at={0.66} mode="grow" span={0.18} position={[0.02, 0.53, ROOM_Z - 0.32]}>
        <Label text={lab.title} height={0.05} />
      </PopUp>
      {models.length > 0 && <Models models={models} slots={room.slots} />}
    </group>
  );
}

export function PhysicsLabScene() {
  return <LabScene lab={LABS.physics} />;
}

export function ChemistryLabScene() {
  return <LabScene lab={LABS.chemistry} />;
}
