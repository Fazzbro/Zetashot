import { describe, it, expect } from 'vitest';
import mcpHandler from '../../api/mcp';

async function invokeMcp(method: string, params?: any, id: number = 1) {
  return new Promise<any>((resolve) => {
    const req: any = {
      method: 'POST',
      headers: { host: 'localhost:5173' },
      body: {
        jsonrpc: '2.0',
        id,
        method,
        params,
      },
      on: (event: string, cb: () => void) => {
        if (event === 'end') cb();
      },
    };

    let resData = '';
    const res: any = {
      statusCode: 200,
      setHeader: () => {},
      writeHead: () => {},
      end: (chunk?: string) => {
        if (chunk) resData += chunk;
        resolve(JSON.parse(resData));
      },
    };

    mcpHandler(req, res);
  });
}

describe('Granular MCP Tools for Zetashot Studio', () => {
  it('registers all 5 new granular tools in tools/list', async () => {
    const response = await invokeMcp('tools/list');
    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();

    const toolNames = response.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('compose_interest_regions');
    expect(toolNames).toContain('configure_timeline_clips');
    expect(toolNames).toContain('orchestrate_typography');
    expect(toolNames).toContain('sync_sound_design');
    expect(toolNames).toContain('configure_optics_and_3d');
  });

  describe('compose_interest_regions', () => {
    it('automatically calculates centered pan/zoom and telemetry badges for bounding boxes', async () => {
      const response = await invokeMcp('tools/call', {
        name: 'compose_interest_regions',
        arguments: {
          title: 'Analytics Deep Dive',
          aspectRatio: '16:9',
          pacing: 'cinematic',
          regions: [
            { label: 'Revenue KPI', x: 100, y: 80, width: 220, height: 140, holdDuration: 1.5 },
            { label: 'Conversion Funnel', x: 420, y: 160, width: 280, height: 190, holdDuration: 2.0 },
          ],
        },
      });

      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      expect(text).toContain('Vision-Driven Auto-Composition');
      expect(text).toContain('Revenue KPI');
      expect(text).toContain('Conversion Funnel');
      expect(text).toContain('Hero Authority Resolve');
      expect(text).toContain('?ratio=16%3A9');
    });
  });

  describe('configure_timeline_clips', () => {
    it('sequences multiple media clips contiguously with speed compensation and transitions', async () => {
      const response = await invokeMcp('tools/call', {
        name: 'configure_timeline_clips',
        arguments: {
          title: '3-Scene Product Journey',
          clips: [
            { sourceUrl: '/assets/intro.png', duration: 3.0, transitionIn: 'cut' },
            { sourceUrl: '/assets/workflow.mp4', type: 'video', duration: 4.0, playbackSpeed: 1.25, transitionIn: 'gradient' },
            { sourceUrl: '/assets/closing.png', duration: 3.0, transitionIn: 'blocks' },
          ],
          autoCompensateSpeed: true,
        },
      });

      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      expect(text).toContain('Multi-Clip Timeline Configured');
      expect(text).toContain('3 Contiguous Clips');
      expect(text).toContain('10s'); // 3 + 4 + 3 = 10s
      expect(text).toContain('gradient');
      expect(text).toContain('blocks');
    });
  });

  describe('orchestrate_typography', () => {
    it('creates and positions 3D typography overlays and telemetry badges with scopes', async () => {
      const response = await invokeMcp('tools/call', {
        name: 'orchestrate_typography',
        arguments: {
          title: 'Typography Precision',
          overlays: [
            { text: 'Engineered for Scale', font: 'Sora', startTime: 0.5, duration: 2.5, style: 'title-card', scope: 'word' },
            { text: '⚡ 99.99% TELEMETRY', font: 'SF Pro Display', startTime: 3.2, duration: 2.0, style: 'telemetry-pill', scope: 'all' },
            { text: '10x Faster', font: 'Helvetica', startTime: 5.5, duration: 2.0, style: 'metric-counter' },
          ],
        },
      });

      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      expect(text).toContain('Kinetic Typography & Badges Orchestrated');
      expect(text).toContain('Engineered for Scale');
      expect(text).toContain('99.99% TELEMETRY');
      expect(text).toContain('10x Faster');
      expect(text).toContain('Sora');
      expect(text).toContain('SF Pro Display');
    });
  });

  describe('sync_sound_design', () => {
    it('synthesizes BGM and auto-syncs whoosh, sub-drop, pop, and chime SFX triggers', async () => {
      const response = await invokeMcp('tools/call', {
        name: 'sync_sound_design',
        arguments: {
          bgmTrack: 'cinematic-saas',
          bgmVolume: 0.7,
          autoSyncSfx: true,
          timelineDuration: 8.0,
        },
      });

      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      expect(text).toContain('Sound Design & SFX Synchronized');
      expect(text).toContain('cinematic-saas');
      expect(text).toContain('Sub-Drop Monolith Reveal');
      expect(text).toContain('Camera Whoosh');
      expect(text).toContain('Landing Resolve Chime');
    });
  });

  describe('configure_optics_and_3d', () => {
    it('configures DoF blur, specular edge glow, corner squircle radius, and WebGL materials', async () => {
      const response = await invokeMcp('tools/call', {
        name: 'configure_optics_and_3d',
        arguments: {
          dof: { enabled: true, aperture: 32 },
          specularGlow: { enabled: true, hexOverride: '#6366f1' },
          shadow: { blur: 48, opacity: 0.6, yOffset: 16 },
          cornerRadius: 24,
          webglMaterial: {
            roughness: 0.15,
            metalness: 0.9,
            tintHex: '#e0e7ff',
            textureRepeat: [2, 2],
            flipY: true,
          },
        },
      });

      expect(response.result).toBeDefined();
      const text = response.result.content[0].text;
      expect(text).toContain('Optics, Lighting & WebGL Materials Configured');
      expect(text).toContain('Depth of Field (DoF)');
      expect(text).toContain('#6366f1');
      expect(text).toContain('24px'); // cornerRadius
      expect(text).toContain('Roughness `0.15`');
      expect(text).toContain('Metalness `0.9`');
    });
  });
});
