import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera } from 'three';
import { book } from '../content/book.ts';
import { bookStore, useBookStore } from '../state/bookStore.ts';
import { COVER_HEIGHT, COVER_WIDTH, REDUCED_MOTION } from './constants.ts';
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
  /** 이 시점으로 옮겨 가는 데 걸리는 대략의 시간(초) */
  smoothTime: number;
}

type ShotName = 'closed-front' | 'closed-back' | 'open' | 'scene';

// 책이 화면 아래 조작 막대에 가리지 않도록 바라보는 점을 조금 앞(+z)에 둔다.
const SHOTS: Record<ShotName, Shot> = {
  'closed-front': {
    target: [COVER_WIDTH / 2, 0.02, 0.16],
    frame: [1.5, 1.85],
    elevation: 1.0,
    azimuth: 0,
    smoothTime: 0.5,
  },
  'closed-back': {
    target: [-COVER_WIDTH / 2, 0.02, 0.16],
    frame: [1.5, 1.85],
    elevation: 1.0,
    azimuth: 0,
    smoothTime: 0.5,
  },
  open: {
    target: [0, 0.01, 0.16],
    frame: [2.5, COVER_HEIGHT + 0.25],
    elevation: 1.05,
    azimuth: 0,
    smoothTime: 0.45,
  },
  // 장면이 일어서는 동안 비스듬히 내려앉으며 입체감을 보여 준다.
  scene: {
    target: [0.12, 0.1, 0.12],
    frame: [2.4, 1.5],
    elevation: 0.72,
    azimuth: 0.16,
    smoothTime: 1.1,
  },
};

/** 화면 비율에 맞춰 frame이 다 들어오는 거리 */
function fitDistance(frame: [number, number], fovDegrees: number, aspect: number): number {
  const vertical = (fovDegrees * Math.PI) / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return Math.max(frame[1] / 2 / Math.tan(vertical / 2), frame[0] / 2 / Math.tan(horizontal / 2));
}

/**
 * 펼침면에 맞춰 카메라를 옮긴다. 3D 장면이 있는 면에서는
 * 넘기는 동안 위에서 내려다보다가(평면 도면), 책장이 멈추면 비스듬히 내려앉는다(입체).
 * 사용자는 끌어서 돌리고 휠로 확대할 수 있다.
 */
export function CameraRig() {
  const controls = useRef<CameraControls>(null);
  const spread = useBookStore((state) => state.spread);
  const settled = useBookStore((state) => state.settled);
  const dragging = useBookStore((state) => state.dragging);
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  const sceneSpreads = useMemo(
    () => new Set(book.pages.flatMap((page, index) => (page.scene ? [index / 2] : []))),
    [],
  );
  const count = spreadCount(book.pages);
  const name: ShotName =
    spread === 0
      ? 'closed-front'
      : spread === count - 1
        ? 'closed-back'
        : sceneSpreads.has(spread) && (settled || dragging)
          ? 'scene'
          : 'open';
  const animate = useRef(false);

  const frame = useCallback(
    (shotName: ShotName, smooth: boolean) => {
      const control = controls.current;
      if (!control) return;
      const shot = SHOTS[shotName];
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 32;
      const distance = fitDistance(shot.frame, fov, aspect) * 1.06;
      const [tx, ty, tz] = shot.target;
      const horizontal = distance * Math.cos(shot.elevation);
      control.smoothTime = REDUCED_MOTION ? 0.2 : shot.smoothTime;
      void control.setLookAt(
        tx + horizontal * Math.sin(shot.azimuth),
        ty + distance * Math.sin(shot.elevation),
        tz + horizontal * Math.cos(shot.azimuth),
        tx,
        ty,
        tz,
        smooth,
      );
    },
    [camera, aspect],
  );

  // 시점이나 화면 비율이 바뀌면 옮긴다(처음 한 번은 바로 놓는다).
  useEffect(() => {
    frame(name, animate.current);
    animate.current = true;
  }, [frame, name]);

  // '시점 처음으로' 단추
  useEffect(
    () =>
      bookStore.subscribe((state, previous) => {
        if (state.viewResetCount !== previous.viewResetCount) frame(name, true);
      }),
    [frame, name],
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
