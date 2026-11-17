import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { book } from '../content/book.ts';
import { colorUniform, setUniform } from '../fx/uniforms.ts';
import { inkUniforms } from '../ink/inkMaterial.ts';
import { bookStore } from '../state/bookStore.ts';
import { REDUCED_MOTION } from './constants.ts';
import { LAMP, stage } from './stageState.ts';
import { pagesOfSpread } from './structure.ts';

const DEFAULT_MOOD = '#ffb46b';
const ROOM_DAY = new THREE.Color('#d9cfbf');
const ROOM_NIGHT = new THREE.Color('#27313d');
const { damp, lerp } = THREE.MathUtils;
const scratch = new THREE.Color();

/**
 * 조명. 문서 상태에서는 창가의 밝은 빛이고, 3D 실험을 켜면 방이 어두워지며
 * 스탠드(따뜻한 스포트라이트)가 오른쪽 페이지의 장치를 비추고 분위기 색 보조 조명이 켜진다.
 */
export function StageLights() {
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    const light = spot.current;
    if (!light) return;
    light.target.position.set(...LAMP.aim);
    light.target.updateMatrixWorld();
  }, []);

  useFrame((state, delta) => {
    const { experiment, spread } = bookStore.getState();
    const goal = experiment ? 1 : 0;
    stage.level = REDUCED_MOTION ? goal : damp(stage.level, goal, experiment ? 2.4 : 3.2, delta);
    if (Math.abs(stage.level - goal) < 0.002) stage.level = goal;
    const s = stage.level;

    const mood = pagesOfSpread(book.pages, spread).right?.mood ?? DEFAULT_MOOD;
    stage.mood.lerp(scratch.set(mood), 1 - Math.exp(-5 * delta));

    if (hemisphere.current) hemisphere.current.intensity = lerp(1.15, 0.4, s);
    if (key.current) key.current.intensity = lerp(2.1, 0.7, s);
    if (spot.current) {
      spot.current.intensity = lerp(0, 7.5, s);
      // 꺼져 있을 때는 그림자를 새로 그리지 않는다.
      spot.current.shadow.autoUpdate = s > 0.01;
    }
    if (fill.current) {
      fill.current.intensity = lerp(0, 1.1, s);
      fill.current.color.copy(stage.mood);
    }
    inkUniforms.uPaperLight.value = lerp(1, 0.9, s);

    // 방(배경과 안개)도 함께 어두워진다.
    const { background, fog } = state.scene;
    if (background instanceof THREE.Color) background.lerpColors(ROOM_DAY, ROOM_NIGHT, s);
    if (fog) fog.color.lerpColors(ROOM_DAY, ROOM_NIGHT, s);
  });

  return (
    <>
      <hemisphereLight ref={hemisphere} args={['#fff8ec', '#9c8a70', 1.15]} />
      {/* 왼쪽 위 창문에서 들어오는 빛 */}
      <directionalLight
        ref={key}
        position={[-2.4, 4.4, 1.6]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.015}
      >
        <orthographicCamera attach="shadow-camera" args={[-2.2, 2.2, 2.2, -2.2, 0.5, 12]} />
      </directionalLight>
      {/* 스탠드: 실험 장치를 비추는 따뜻한 조명 */}
      <spotLight
        ref={spot}
        position={LAMP.light}
        color="#ffe9c4"
        intensity={0}
        angle={0.66}
        penumbra={0.6}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.012}
        shadow-camera-near={0.25}
        shadow-camera-far={3.2}
      />
      {/* 분위기 색 보조 조명: 그늘진 면에 단원의 색이 감돈다. */}
      <directionalLight ref={fill} position={[-1.6, 0.7, 1.7]} intensity={0} />
    </>
  );
}

const VIGNETTE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const VIGNETTE_FRAGMENT = /* glsl */ `
uniform float uLevel;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  // 화면 가운데(조금 위)는 밝게 두고 가장자리로 갈수록 어둡게
  float d = length((vUv - vec2(0.5, 0.54)) * vec2(1.1, 1.3));
  float edge = smoothstep(0.26, 0.84, d);
  gl_FragColor = vec4(uColor, uLevel * (0.06 + 0.66 * edge));
  #include <colorspace_fragment>
}
`;

/** 실험 무대에서 화면 가장자리를 어둡게 눌러 시선을 장치로 모은다. */
export function Vignette() {
  const uniforms = useMemo(
    () => ({ uLevel: { value: 0 }, uColor: { value: new THREE.Color('#0d141c') } }),
    [],
  );
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  useFrame(() => {
    setUniform(material.current, 'uLevel', stage.level);
    // 어두운 남색에 단원의 분위기 색을 조금 섞는다.
    colorUniform(material.current, 'uColor')?.set('#0d141c').lerp(stage.mood, 0.1);
    if (mesh.current) mesh.current.visible = stage.level > 0.002;
  });
  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={1000} visible={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={VIGNETTE_VERTEX}
        fragmentShader={VIGNETTE_FRAGMENT}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
