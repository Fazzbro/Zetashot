import { describe, it, expect } from 'vitest';
import {
  createDefaultProject,
  serializeProjectToJson,
  deserializeProjectFromJson,
  ProjectState,
} from './projectSerialization';

describe('projectSerialization', () => {
  it('creates a valid default project with all required properties', () => {
    const project = createDefaultProject('My Test Project');
    expect(project.name).toBe('My Test Project');
    expect(project.version).toBe('1.0.0');
    expect(project.viewport.width).toBe(1440);
    expect(project.viewport.height).toBe(900);
    expect(project.deviceMockup.type).toBe('mac-safari');
    expect(project.background.type).toBe('gradient');
    expect(project.effects.shadowSpread).toBeDefined();
    expect(project.timeline.keyframes.length).toBeGreaterThanOrEqual(1);
  });

  it('serializes and deserializes project state losslessly', () => {
    const original = createDefaultProject('E-Commerce Demo');
    original.viewport.width = 1920;
    original.viewport.height = 1080;
    original.effects.borderRadius = 24;

    const json = serializeProjectToJson(original);
    const parsed = deserializeProjectFromJson(json);

    expect(parsed.name).toBe('E-Commerce Demo');
    expect(parsed.viewport.width).toBe(1920);
    expect(parsed.viewport.height).toBe(1080);
    expect(parsed.effects.borderRadius).toBe(24);
  });

  it('handles corrupted JSON gracefully by returning a sanitized fallback', () => {
    const result = deserializeProjectFromJson('invalid-json');
    expect(result).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.viewport.width).toBe(1440);
  });
});
