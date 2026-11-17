import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { assignSlots, fitModel, parseRoom } from './room.ts';

function mesh(name: string, color: string, size = 1, opacity = 1): THREE.Mesh {
  const result = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ color, opacity, transparent: opacity < 1 }),
  );
  result.name = name;
  return result;
}

function sampleRoom(): THREE.Group {
  const root = new THREE.Group();
  const floor = mesh('ENV_floor', '#d8c3a0', 4);
  const wall = mesh('ENV_wall_back', '#f1e8d5', 3);
  wall.position.set(0, 1.5, -2);
  // 가구 묶음: 자식 메시의 자리는 묶음 기준
  const island = new THREE.Group();
  island.name = 'PRP_island';
  island.position.set(1, 0, 1);
  const top = mesh('island_top', '#3f4a54');
  top.position.set(0, 0.9, 0);
  const handle = mesh('island_handle', '#9aa5b0', 0.05);
  island.add(top, handle);
  const windowGroup = new THREE.Group();
  windowGroup.name = 'PRP_window';
  windowGroup.position.set(-2, 1.5, -1);
  windowGroup.add(mesh('window_glass', '#a9cfe0', 1, 0.35));
  const board = new THREE.Group();
  board.name = 'PRP_blackboard';
  board.position.set(-1, 1.7, -1.9);
  board.add(mesh('board_text_1', '#f4ecd6', 0.3));
  const slot = new THREE.Object3D();
  slot.name = 'SLOT_island_1';
  slot.position.set(1, 0.9, 1);
  const camera = new THREE.PerspectiveCamera();
  camera.name = 'CAM_main';
  root.add(floor, wall, island, windowGroup, board, slot, camera);
  return root;
}

describe('parseRoom', () => {
  const room = parseRoom(sampleRoom());

  it('gathers the floor and walls into one unit that rises first', () => {
    expect(room.units[0]).toMatchObject({ name: 'ENV', env: true, at: 0 });
    expect(room.units[0]!.parts.map((part) => part.color)).toEqual(['#d8c3a0', '#f1e8d5']);
  });

  it('keeps each piece of furniture as a unit, back-left first, and skips cameras', () => {
    // 창문(-2, ·, -1)이 칠판(-1, ·, -1.9)보다 구석에 가깝다.
    expect(room.units.slice(1).map((unit) => unit.name)).toEqual([
      'PRP_window',
      'PRP_blackboard',
      'PRP_island',
    ]);
    const times = room.units.slice(1).map((unit) => unit.at);
    expect(times).toEqual(times.toSorted((a, b) => a - b));
    expect(times.at(-1)).toBeLessThanOrEqual(0.6);
  });

  it('places parts in room coordinates and marks glass, chalk writing and small parts', () => {
    const island = room.units.find((unit) => unit.name === 'PRP_island')!;
    expect(island.parts[0]!.position.toArray()).toEqual([1, 0.9, 1]);
    expect(island.parts.map((part) => part.small)).toEqual([false, true]);
    const glass = room.units.find((unit) => unit.name === 'PRP_window')!.parts[0]!;
    expect(glass.glass).toBe(true);
    const chalk = room.units.find((unit) => unit.name === 'PRP_blackboard')!.parts[0]!;
    expect(chalk.plain).toBe(true);
  });

  it('reads the slots for models', () => {
    expect([...room.slots.keys()]).toEqual(['SLOT_island_1']);
    expect(room.slots.get('SLOT_island_1')!.toArray()).toEqual([1, 0.9, 1]);
  });
});

describe('assignSlots', () => {
  const slots = ['SLOT_shelf_1', 'SLOT_floor_1', 'SLOT_island_2', 'SLOT_island_1', 'SLOT_back_1'];

  it('fills the best places first: island, back bench, …, floor', () => {
    const placed = assignSlots([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], slots);
    expect([...placed.entries()]).toEqual([
      ['a', 'SLOT_island_1'],
      ['b', 'SLOT_island_2'],
      ['c', 'SLOT_back_1'],
      ['d', 'SLOT_shelf_1'],
    ]);
  });

  it('honours a requested slot and leaves out models that do not fit', () => {
    const placed = assignSlots(
      [{ id: 'a' }, { id: 'b', slot: 'SLOT_island_1' }, { id: 'c', slot: 'SLOT_missing' }],
      ['SLOT_island_1', 'SLOT_island_2'],
    );
    expect(placed.get('b')).toBe('SLOT_island_1');
    expect(placed.get('a')).toBe('SLOT_island_2');
    expect(placed.has('c')).toBe(false);
  });
});

describe('fitModel', () => {
  it('scales the longest side to the size and stands the model on the origin', () => {
    const box = new THREE.Box3(new THREE.Vector3(2, 10, -4), new THREE.Vector3(4, 14, 0));
    const { scale, offset } = fitModel(box, 0.5);
    expect(scale).toBeCloseTo(0.125);
    // 가운데 (3, ·, -2)가 원점으로, 바닥(y = 10)이 0으로
    expect(offset.toArray()).toEqual([-0.375, -1.25, 0.25]);
  });

  it('leaves an empty model alone', () => {
    expect(fitModel(new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()), 0.5).scale).toBe(1);
  });
});
