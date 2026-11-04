import { advance, Canvas, useThree } from '@react-three/fiber';
import { Suspense, use, useEffect, type ReactNode } from 'react';
import * as THREE from 'three';
import { book } from '../content/book.ts';
import { inkUniforms } from '../ink/inkMaterial.ts';
import { actionPosition, CAPTURE, listActions, runAction } from '../lib/capture.ts';
import { bookStore } from '../state/bookStore.ts';
import { Book } from './Book.tsx';
import { CameraRig } from './CameraRig.tsx';
import { Desk } from './Desk.tsx';
import { collectText, loadFonts } from './fonts.ts';

/** 페이지를 그리기 전에 글꼴을 받는다(한 번만). */
const fontsReady = loadFonts(collectText(book.pages));

function WhenFontsReady({ children }: { children: ReactNode }) {
  use(fontsReady);
  return children;
}

/** 빗금 굵기를 화면 해상도에 맞춘다. */
function InkScale() {
  const dpr = useThree((state) => state.viewport.dpr);
  useEffect(() => {
    inkUniforms.uInkScale.value = dpr;
  }, [dpr]);
  return null;
}

/**
 * 영상 녹화 모드에서 녹화 스크립트가 쓰는 창구(window.__book).
 * advance(초)로 그 시각의 화면을 한 장 그리고, run(이름)으로 단추·덮개 등을 누른다.
 */
function CaptureBridge() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const api = {
      /** 그 시각의 화면을 그리고, GPU가 다 그릴 때까지 기다린다(작업이 밀려 쌓이지 않게). */
      advance: (seconds: number) => {
        advance(seconds);
        gl.getContext().finish();
      },
      run: runAction,
      actions: listActions,
      store: bookStore,
      /** 장면 좌표의 화면 위치(px) */
      project: (x: number, y: number, z: number): [number, number] => {
        const projected = new THREE.Vector3(x, y, z).project(camera);
        return [((projected.x + 1) / 2) * size.width, ((1 - projected.y) / 2) * size.height];
      },
      /** 등록된 동작의 화면 위치(px). 가짜 마우스 포인터를 그 자리에 보여 줄 때 쓴다. */
      screen: (id: string): [number, number] | null => {
        const point = actionPosition(id);
        if (!point) return null;
        const projected = new THREE.Vector3(...point).project(camera);
        return [((projected.x + 1) / 2) * size.width, ((1 - projected.y) / 2) * size.height];
      },
    };
    Object.assign(window, { __book: api });
  }, [camera, size, gl]);
  return null;
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff8ec', '#9c8a70', 1.15]} />
      {/* 왼쪽 위 창문에서 들어오는 빛 */}
      <directionalLight
        position={[-2.4, 4.4, 1.6]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.015}
      >
        <orthographicCamera attach="shadow-camera" args={[-2.2, 2.2, 2.2, -2.2, 0.5, 12]} />
      </directionalLight>
    </>
  );
}

export function BookCanvas() {
  return (
    <div className="absolute inset-0" role="img" aria-label="책상 위에 놓인 3D 교과서">
      <Canvas
        frameloop={CAPTURE ? 'never' : 'always'}
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 32, near: 0.05, far: 40, position: [0.5, 2.6, 1.9] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
        }}
      >
        <color attach="background" args={['#d9cfbf']} />
        <fog attach="fog" args={['#d9cfbf', 7, 16]} />
        <InkScale />
        {CAPTURE && <CaptureBridge />}
        <Lights />
        <Desk />
        <Suspense fallback={null}>
          <WhenFontsReady>
            <Book />
          </WhenFontsReady>
        </Suspense>
        <CameraRig />
      </Canvas>
    </div>
  );
}
