import { describe, it, expect } from 'vitest';
import { GUIDE_STEPS } from './BeginnerGuide';

describe('BeginnerGuide Tour Configuration', () => {
  it('contains 6 comprehensive onboarding steps covering all core studio features', () => {
    expect(GUIDE_STEPS).toHaveLength(6);
  });

  it('verifies step order and essential feature coverage', () => {
    const stepIds = GUIDE_STEPS.map((s) => s.id);
    expect(stepIds).toEqual([
      'media-library',
      'move-and-orbit',
      'studio-optics',
      'ai-compose',
      'video-timeline',
      'export-engine',
    ]);
  });

  it('ensures every step provides a clear action prompt and valid selector', () => {
    GUIDE_STEPS.forEach((step) => {
      expect(step.title.length).toBeGreaterThan(3);
      expect(step.detail.length).toBeGreaterThan(10);
      expect(step.actionHint.length).toBeGreaterThan(5);
      expect(step.targetElementSelector).toMatch(/^\[data-guide="[a-z-]+"]$/);
      expect(step.stepNumber).toBeGreaterThan(0);
    });
  });

  it('verifies AI Compose step explicitly details Operator -> Rectangle -> Compose workflow', () => {
    const composeStep = GUIDE_STEPS.find((s) => s.id === 'ai-compose');
    expect(composeStep).toBeDefined();
    expect(composeStep?.actionHint).toContain('Operator');
    expect(composeStep?.actionHint).toContain('rectangle');
    expect(composeStep?.actionHint).toContain('Compose');
    expect(composeStep?.detail).toContain('Operator');
    expect(composeStep?.detail).toContain('rectangle');
    expect(composeStep?.detail).toContain('Compose');
  });
});
