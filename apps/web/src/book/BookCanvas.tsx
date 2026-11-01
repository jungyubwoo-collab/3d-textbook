import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, use, useEffect, type ReactNode } from 'react';
import * as THREE from 'three';
import { book } from '../content/book.ts';
import { inkUniforms } from '../ink/inkMaterial.ts';
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
