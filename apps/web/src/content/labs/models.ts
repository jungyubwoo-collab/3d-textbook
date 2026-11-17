/**
 * 에셋 허브(사내 3D 에셋 저장소)에서 골라 온 주요 3D 모델.
 * 허브에 접속하지 못해도 책에서 볼 수 있게 GLB 파일을 책에 함께 싣는다(public/models/hub/<id>.glb).
 * 모델을 더하려면 파일을 넣고 아래 목록에 한 줄을 적는다.
 */
export type LabId = 'physics' | 'chemistry';

export interface HubModel {
  /** 파일 이름에서 확장자를 뺀 것(소문자·숫자·하이픈) */
  id: string;
  /** 화면에 보이는 이름 */
  name: string;
  /** 어느 실험실에 놓는지 */
  lab: LabId;
  /** 허브에서의 이름(원본을 다시 받을 때 찾는다) */
  source: string;
  /** 놓을 자리(실험실 GLB의 SLOT_ 이름). 없으면 빈 자리에 차례로 놓는다. */
  slot?: string;
  /** 실험실 안에서의 크기(가장 긴 변, m). 없으면 자리에 맞춘다(`room.ts`의 `slotLimit`). */
  size?: number;
  /** 세워 놓는 방향(도, 위에서 봤을 때 반시계 방향). 없으면 자리에 맞춘다. */
  turn?: number;
}

/** 에셋 허브 안내: 전체 모델 수와 프로젝트 주소(로그인이 필요하다) */
export const HUB = {
  total: '370여 종',
  url: 'https://assethub.bigbenett.com/projects/ac1e749a-de3a-4c07-907b-f984ac856f22',
} as const;

const physics = (id: string, name: string, source: string, slot: string): HubModel => ({
  id,
  name,
  lab: 'physics',
  source,
  slot: `SLOT_${slot}`,
});

const chemistry = (id: string, name: string, source: string, slot: string): HubModel => ({
  id,
  name,
  lab: 'chemistry',
  source,
  slot: `SLOT_${slot}`,
});

/** 목록의 순서가 곧 받침대에서 넘겨 보는 순서다. */
export const hubModels: HubModel[] = [
  // 물리: 가운데 실험대에는 이 책의 실험에 나오는 역학 기구를 둔다.
  physics('dynamics-cart', '역학 수레', 'sci_p07_dynamics_cart', 'island_1'),
  physics('ticker-timer', '시간기록계', 'sci_p09_ticker_timer', 'island_2'),
  physics('block-and-tackle', '복합 도르래', 'sci_p05_block_and_tackle', 'island_3'),
  physics('inclined-plane', '빗면', 'sci_p06_inclined_plane', 'island_4'),
  physics('spring-scale', '용수철저울', 'sci_p01_spring_scale', 'shelf_1'),
  physics('hooked-weights', '고리 추', 'sci_p03_hooked_weights', 'shelf_2'),
  physics('pulley', '도르래', 'sci_p04_pulley', 'shelf_3'),
  physics('tuning-fork', '소리굽쇠', 'sci_p31_tuning_fork', 'shelf_4'),
  physics('horseshoe-magnet', '말굽자석', 'sci_p55_horseshoe_magnet', 'shelf_5'),
  physics('dc-motor-model', '전동기 모형', 'sci_p59_dc_motor_model', 'shelf_6'),
  physics('oscilloscope', '오실로스코프', 'sci_p42_oscilloscope', 'back_1'),
  physics('multimeter', '멀티미터', 'sci_p49_multimeter', 'back_2'),
  physics('loop-track', '루프 궤도', 'sci_p18_loop_track', 'left_1'),
  physics('stirling-engine', '스털링 엔진', 'sci_p29_stirling_engine', 'left_2'),
  physics('spectrometer', '분광기', 'sci_p41_spectrometer', 'left_3'),
  physics('wimshurst-machine', '윔즈허스트 기전기', 'sci_p64_wimshurst_machine', 'left_4'),
  physics('photogate', '포토게이트', 'sci_p10_photogate', 'cart_1'),
  physics('van-de-graaff', '밴더그래프 발전기', 'sci_p63_van_de_graaff', 'floor_1'),

  // 화학: 가운데 실험대에는 전지와 지시약, 선반에는 분자 모형을 둔다.
  chemistry('daniell-cell', '다니엘 전지', 'sci_h12_daniell_cell', 'island_1'),
  chemistry('lemon-battery', '레몬 전지', 'sci_h26_lemon_battery', 'island_2'),
  // 개수대 옆 자리에는 폭이 좁은 것을 둔다.
  chemistry('indicator-color-tubes', '지시약 시험관', 'sci_h24_indicator_color_tubes', 'island_3'),
  chemistry('water-molecule', '물 분자 모형', 'sci_h01_water_molecule', 'shelf_1'),
  chemistry('methane-molecule', '메테인 분자 모형', 'sci_h02_methane_molecule', 'shelf_2'),
  chemistry('co2-molecule', '이산화 탄소 분자 모형', 'sci_h03_co2_molecule', 'shelf_3'),
  chemistry('ammonia-molecule', '암모니아 분자 모형', 'sci_h04_ammonia_molecule', 'shelf_4'),
  chemistry('nacl-lattice', '염화 나트륨 결정 모형', 'sci_h07_nacl_lattice', 'back_1'),
  chemistry('diamond-lattice', '다이아몬드 결정 모형', 'sci_h08_diamond_lattice', 'back_2'),
  chemistry('hofmann-voltameter', '호프만 전해 장치', 'sci_h11_hofmann_voltameter', 'left_1'),
  chemistry('gas-generator', '기체 발생 장치', 'sci_h13_gas_generator', 'left_2'),
  chemistry('electrolysis-beaker', '전기 분해 장치', 'sci_h32_electrolysis_beaker', 'left_3'),
  chemistry(
    'copper-sulfate-crystals',
    '황산 구리 결정',
    'sci_h22_copper_sulfate_crystals',
    'cart_1',
  ),
  chemistry('oxygen-cylinder', '산소통', 'sci_h20_oxygen_cylinder', 'floor_1'),
];

export const modelsOf = (lab: LabId): HubModel[] => hubModels.filter((model) => model.lab === lab);

export const modelUrl = (model: HubModel): string => `/models/hub/${model.id}.glb`;
