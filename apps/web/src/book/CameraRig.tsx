import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera } from 'three';
import { book } from '../content/book.ts';
import { bookStore, useBookStore } from '../state/bookStore.ts';
import { COVER_HEIGHT, COVER_WIDTH } from './constants.ts';
import { spreadCount } from './structure.ts';

interface Shot {
  /** 바라보는 점 */
  target: [number, number, number];
  /** 화면에 담을 영역(가로, 세로) */
  frame: [number, number];
  /** 내려다보는 각도(라디안, 0 = 수평) */
  elevation: number;
  /** 좌우로 도는 각도(라디안) */
  azimuth: number;
}

function shotFor(spread: number, count: number, hasScene: boolean): Shot {
  // 책이 화면 아래 조작 막대에 가리지 않도록 바라보는 점을 조금 앞(+z)에 둔다.
  if (spread === 0)
    return {
      target: [COVER_WIDTH / 2, 0.02, 0.16],
      frame: [1.5, 1.85],
      elevation: 1.0,
      azimuth: 0,
    };
  if (spread === count - 1) {
    return {
      target: [-COVER_WIDTH / 2, 0.02, 0.16],
      frame: [1.5, 1.85],
      elevation: 1.0,
      azimuth: 0,
    };
  }
  if (hasScene)
    return { target: [0.12, 0.08, 0.14], frame: [2.45, 1.55], elevation: 0.76, azimuth: 0.14 };
  return { target: [0, 0.01, 0.16], frame: [2.5, COVER_HEIGHT + 0.25], elevation: 1.0, azimuth: 0 };
}

/** 화면 비율에 맞춰 frame이 다 들어오는 거리 */
function fitDistance(frame: [number, number], fovDegrees: number, aspect: number): number {
  const vertical = (fovDegrees * Math.PI) / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return Math.max(frame[1] / 2 / Math.tan(vertical / 2), frame[0] / 2 / Math.tan(horizontal / 2));
}

/** 펼침면에 맞춰 카메라를 옮긴다. 사용자는 끌어서 돌리고 휠로 확대할 수 있다. */
export function CameraRig() {
  const controls = useRef<CameraControls>(null);
  const spread = useBookStore((state) => state.spread);
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  const sceneSpreads = useMemo(
    () => new Set(book.pages.flatMap((page, index) => (page.scene ? [index / 2] : []))),
    [],
  );
  const animate = useRef(false);

  const frame = useCallback(
    (smooth: boolean) => {
      if (!controls.current) return;
      const shot = shotFor(spread, spreadCount(book.pages), sceneSpreads.has(spread));
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 32;
      const distance = fitDistance(shot.frame, fov, aspect) * 1.06;
      const [tx, ty, tz] = shot.target;
      const horizontal = distance * Math.cos(shot.elevation);
      void controls.current.setLookAt(
        tx + horizontal * Math.sin(shot.azimuth),
        ty + distance * Math.sin(shot.elevation),
        tz + horizontal * Math.cos(shot.azimuth),
        tx,
        ty,
        tz,
        smooth,
      );
    },
    [spread, sceneSpreads, aspect, camera],
  );

  // 펼침면이나 화면 비율이 바뀌면 시점을 옮긴다(처음 한 번은 바로 놓는다).
  useEffect(() => {
    frame(animate.current);
    animate.current = true;
  }, [frame]);

  // '시점 처음으로' 단추
  useEffect(
    () =>
      bookStore.subscribe((state, previous) => {
        if (state.viewResetCount !== previous.viewResetCount) frame(true);
      }),
    [frame],
  );

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={0.7}
      maxDistance={7}
      minPolarAngle={0.08}
      maxPolarAngle={1.32}
      smoothTime={0.5}
      draggingSmoothTime={0.12}
    />
  );
}
