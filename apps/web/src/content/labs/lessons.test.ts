import { describe, expect, it } from 'vitest';
import { modelsByPlace } from './lessons.ts';
import { hubModels, modelsOf, type HubModel } from './models.ts';

const model = (name: string, slot?: string): HubModel => ({
  id: name,
  name,
  lab: 'physics',
  source: name,
  ...(slot === undefined ? {} : { slot }),
});

describe('modelsByPlace', () => {
  it('groups model names by where they stand, best places first', () => {
    const lines = modelsByPlace([
      model('추', 'SLOT_shelf_2'),
      model('수레', 'SLOT_island_1'),
      model('저울', 'SLOT_shelf_1'),
      model('발전기', 'SLOT_floor_1'),
    ]);
    expect(lines).toEqual(['가운데 실험대: 수레', '선반: 추, 저울', '바닥: 발전기']);
  });

  it('keeps models without a known place in a last group', () => {
    expect(modelsByPlace([model('자석'), model('수레', 'SLOT_island_1')])).toEqual([
      '가운데 실험대: 수레',
      '그 밖에: 자석',
    ]);
  });

  it('names every model of each lab exactly once', () => {
    for (const lab of ['physics', 'chemistry'] as const) {
      // "선반: 추, 저울" → 추, 저울
      const named = modelsByPlace(modelsOf(lab)).flatMap((line) =>
        line.slice(line.indexOf(': ') + 2).split(', '),
      );
      const expected = modelsOf(lab).map((entry) => entry.name);
      expect(named.toSorted()).toEqual(expected.toSorted());
    }
  });
});

describe('hubModels', () => {
  it('uses lowercase-hyphen ids that are unique', () => {
    const ids = hubModels.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('gives each model its own slot within a lab', () => {
    for (const lab of ['physics', 'chemistry'] as const) {
      const slots = modelsOf(lab).flatMap((entry) => (entry.slot ? [entry.slot] : []));
      expect(new Set(slots).size).toBe(slots.length);
    }
  });
});
