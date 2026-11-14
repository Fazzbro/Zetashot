import { describe, it, expect } from 'vitest';
import {
  createHistoryState,
  recordAction,
  undoAction,
  redoAction,
  MAX_HISTORY_LIMIT,
  StudioHistorySnapshot,
} from './historyManager';

function createMockSnapshot(id: string, rotX: number = 0): StudioHistorySnapshot {
  return {
    clips: [
      {
        id,
        name: id,
        startTime: 0,
        duration: 3,
        camera: { rotX, rotY: 0, rotZ: 0, zoom: 1, panX: 0, panY: 0, perspective: 1000 },
      },
    ],
    mediaClips: [
      {
        id: `media_${id}`,
        mediaId: `media_${id}`,
        name: `Media ${id}`,
        type: 'image',
        url: `https://example.com/${id}.png`,
        startTime: 0,
        duration: 3,
      },
    ],
    camera: { rotX, rotY: 0, rotZ: 0, zoom: 1, panX: 0, panY: 0, perspective: 1000 },
    textLayers: [],
    background: { type: 'solid', color: '#ffffff' },
    aspectRatio: '16:9',
    shadowDepth: 'large',
    borderRadius: 12,
    blurAmount: 0,
    audioTracks: [],
    interestRegions: [],
    activeMedia: {
      id: `media_${id}`,
      name: `Media ${id}`,
      type: 'image',
      url: `https://example.com/${id}.png`,
      dimensions: '1920 × 1080',
      format: 'PNG',
    },
    selectedClipId: id,
    selectedMediaClipId: `media_${id}`,
    selectedTextLayerId: null,
  };
}

describe('historyManager (Undo / Redo)', () => {
  it('initializes with an empty past and future', () => {
    const s0 = createMockSnapshot('s0');
    const history = createHistoryState(s0);

    expect(history.past.length).toBe(0);
    expect(history.future.length).toBe(0);
    expect(history.present.selectedClipId).toBe('s0');
  });

  it('records actions up to MAX_HISTORY_LIMIT (5) and trims older ones', () => {
    let history = createHistoryState(createMockSnapshot('s0'));

    // Record 7 consecutive actions (s1 .. s7)
    for (let i = 1; i <= 7; i++) {
      history = recordAction(history, createMockSnapshot(`s${i}`, i * 10));
    }

    expect(history.present.selectedClipId).toBe('s7');
    // past must be capped at exactly MAX_HISTORY_LIMIT (5)
    expect(history.past.length).toBe(MAX_HISTORY_LIMIT);
    expect(history.past.map((s) => s.selectedClipId)).toEqual(['s2', 's3', 's4', 's5', 's6']);
  });

  it('ignores recording if the new snapshot is identical to present', () => {
    let history = createHistoryState(createMockSnapshot('s0'));
    history = recordAction(history, createMockSnapshot('s0'));

    expect(history.past.length).toBe(0);
    expect(history.present.selectedClipId).toBe('s0');
  });

  it('correctly executes undo up to 5 times and stops when past is empty', () => {
    let history = createHistoryState(createMockSnapshot('s0'));
    for (let i = 1; i <= 5; i++) {
      history = recordAction(history, createMockSnapshot(`s${i}`, i * 10));
    }

    expect(history.present.selectedClipId).toBe('s5');
    expect(history.past.length).toBe(5);

    // Undo 1 -> s4
    const u1 = undoAction(history);
    expect(u1).not.toBeNull();
    history = u1!.nextState;
    expect(history.present.selectedClipId).toBe('s4');
    expect(history.future.length).toBe(1);

    // Undo 2 -> s3
    const u2 = undoAction(history);
    expect(u2).not.toBeNull();
    history = u2!.nextState;
    expect(history.present.selectedClipId).toBe('s3');

    // Undo 3 -> s2
    const u3 = undoAction(history);
    expect(u3).not.toBeNull();
    history = u3!.nextState;
    expect(history.present.selectedClipId).toBe('s2');

    // Undo 4 -> s1
    const u4 = undoAction(history);
    expect(u4).not.toBeNull();
    history = u4!.nextState;
    expect(history.present.selectedClipId).toBe('s1');

    // Undo 5 -> s0
    const u5 = undoAction(history);
    expect(u5).not.toBeNull();
    history = u5!.nextState;
    expect(history.present.selectedClipId).toBe('s0');
    expect(history.past.length).toBe(0);

    // 6th Undo must return null because limit of 5 is exhausted
    const u6 = undoAction(history);
    expect(u6).toBeNull();
  });

  it('correctly executes redo after undo and stops when future is empty', () => {
    let history = createHistoryState(createMockSnapshot('s0'));
    history = recordAction(history, createMockSnapshot('s1'));
    history = recordAction(history, createMockSnapshot('s2'));

    // Undo twice back to s0
    history = undoAction(history)!.nextState; // back to s1
    history = undoAction(history)!.nextState; // back to s0
    expect(history.present.selectedClipId).toBe('s0');
    expect(history.future.length).toBe(2);

    // Redo 1 -> s1
    const r1 = redoAction(history);
    expect(r1).not.toBeNull();
    history = r1!.nextState;
    expect(history.present.selectedClipId).toBe('s1');

    // Redo 2 -> s2
    const r2 = redoAction(history);
    expect(r2).not.toBeNull();
    history = r2!.nextState;
    expect(history.present.selectedClipId).toBe('s2');
    expect(history.future.length).toBe(0);

    // Redo again must return null
    const r3 = redoAction(history);
    expect(r3).toBeNull();
  });

  it('clears future redo stack when a new action is recorded after an undo', () => {
    let history = createHistoryState(createMockSnapshot('s0'));
    history = recordAction(history, createMockSnapshot('s1'));
    history = recordAction(history, createMockSnapshot('s2'));

    // Undo to s1
    history = undoAction(history)!.nextState;
    expect(history.future.length).toBe(1);

    // Take brand new action s_new
    history = recordAction(history, createMockSnapshot('s_new'));
    expect(history.present.selectedClipId).toBe('s_new');
    expect(history.future.length).toBe(0); // Redo history cleared
    expect(redoAction(history)).toBeNull();
  });

  it('guarantees deep cloning so mutating object outside does not corrupt history', () => {
    const s0 = createMockSnapshot('s0', 15);
    let history = createHistoryState(s0);

    // Mutate s0 externally
    s0.camera.rotX = 999;
    s0.clips[0].name = 'corrupted';

    expect(history.present.camera.rotX).toBe(15);
    expect(history.present.clips[0].name).toBe('s0');
  });
});
