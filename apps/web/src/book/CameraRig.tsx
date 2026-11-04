import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera } from 'three';
import { book } from '../content/book.ts';
import { bookStore, useBookStore } from '../state/bookStore.ts';
import { COVER_HEIGHT, COVER_WIDTH, PAGE_WIDTH, REDUCED_MOTION } from './constants.ts';
import { spreadCount } from './structure.ts';
import type { CameraFocus } from './types.ts';

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

type ShotName = 'closed-front' | 'closed-back' | 'open' | 'experiment';

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
  // 3D 실험: 오른쪽 페이지의 장치로 다가가 비스듬히 내려다본다(단원마다 focus로 바꿀 수 있다).
  experiment: {
    target: [PAGE_WIDTH / 2, 0.17, 0.03],
    frame: [1.2, 0.92],
    elevation: 0.55,
    azimuth: -0.14,
    smoothTime: 1.0,
  },
};

/** 실험을 마치고 문서로 돌아갈 때는 천천히 물러난다. */
const RETURN_SMOOTH_TIME = 0.9;

function experimentShot(focus: CameraFocus | undefined): Shot {
  const base = SHOTS.experiment;
  if (!focus) return base;
  return {
    target: focus.target,
    frame: focus.frame,
    elevation: focus.elevation ?? base.elevation,
    azimuth: focus.azimuth ?? base.azimuth,
    smoothTime: base.smoothTime,
  };
}

/** 화면 비율에 맞춰 frame이 다 들어오는 거리 */
function fitDistance(frame: [number, number], fovDegrees: number, aspect: number): number {
  const vertical = (fovDegrees * Math.PI) / 180;
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return Math.max(frame[1] / 2 / Math.tan(vertical / 2), frame[0] / 2 / Math.tan(horizontal / 2));
}

/**
 * 펼침면에 맞춰 카메라를 옮긴다. 평소에는 펼친 책 전체를 위에서 내려다보고(2D 문서),
 * 3D 실험을 켜면 오른쪽 페이지의 실험 장치로 다가가 비스듬히 초점을 맞춘다.
 * 실험을 끄면 다시 문서 전체로 물러난다. 사용자는 끌어서 돌리고 휠로 확대할 수 있다.
 */
export function CameraRig() {
  const controls = useRef<CameraControls>(null);
  const spread = useBookStore((state) => state.spread);
  const experiment = useBookStore((state) => state.experiment);
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  /** 3D 실험이 있는 펼침면 → 그 실험의 카메라 초점 */
  const focusOf = useMemo(
    () =>
      new Map(
        book.pages.flatMap((page, index) => (page.scene ? [[index / 2, page.focus] as const] : [])),
      ),
    [],
  );
  const count = spreadCount(book.pages);
  const name: ShotName =
    spread === 0
      ? 'closed-front'
      : spread === count - 1
        ? 'closed-back'
        : experiment && focusOf.has(spread)
          ? 'experiment'
          : 'open';
  const animate = useRef(false);
  const lastShot = useRef<ShotName>(name);

  const frame = useCallback(
    (shotName: ShotName, smooth: boolean) => {
      const control = controls.current;
      if (!control) return;
      const shot =
        shotName === 'experiment' ? experimentShot(focusOf.get(spread)) : SHOTS[shotName];
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 32;
      const distance = fitDistance(shot.frame, fov, aspect) * 1.06;
      const [tx, ty, tz] = shot.target;
      const horizontal = distance * Math.cos(shot.elevation);
      const leaving = lastShot.current === 'experiment' && shotName !== 'experiment';
      lastShot.current = shotName;
      control.smoothTime = REDUCED_MOTION ? 0.2 : leaving ? RETURN_SMOOTH_TIME : shot.smoothTime;
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
    [camera, aspect, focusOf, spread],
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
