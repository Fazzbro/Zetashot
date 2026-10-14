import { describe, it, expect } from 'vitest';
import { encodeProjectToUrl, decodeProjectFromUrl, ZetashotSharedProject } from './projectUrlEncoder';

describe('projectUrlEncoder', () => {
  const sampleProject: ZetashotSharedProject = {
    version: '1.0.0',
    title: 'Claude 3D Mockup Demo',
    aspectRatio: '16:9',
    background: {
      type: 'image',
      imageUrl: '/backgrounds/bg-purple-wave.jpg',
      imageFit: 'cover',
      imageScale: 100,
    },
    cameraClips: [
      {
        id: 'c1',
        name: 'Start',
        startTime: 0,
        duration: 2.0,
        camera: { rotX: 10, rotY: -20, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 },
      },
      {
        id: 'c2',
        name: 'End',
        startTime: 2.0,
        duration: 2.0,
        camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.25, panX: 0, panY: 0, perspective: 1000 },
      },
    ],
    deviceMockup: '3d-phone',
    duration: 4.0,
  };

  it('correctly encodes and decodes a project state in round-trip without loss', () => {
    const encoded = encodeProjectToUrl(sampleProject);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(10);
    // Base64url characters only
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);

    const decoded = decodeProjectFromUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.title).toBe(sampleProject.title);
    expect(decoded?.aspectRatio).toBe('16:9');
    expect(decoded?.background?.imageUrl).toBe('/backgrounds/bg-purple-wave.jpg');
    expect(decoded?.cameraClips?.length).toBe(2);
    expect(decoded?.cameraClips?.[1].camera.zoom).toBe(1.25);
  });

  it('correctly encodes and decodes blank canvas projects with mediaType: blank', () => {
    const blankProject: ZetashotSharedProject = {
      version: '1.0.0',
      mediaName: 'Blank Canvas',
      mediaType: 'blank',
      aspectRatio: '16:9',
      duration: 4.0,
      cameraClips: [
        {
          id: 'p1',
          name: 'P01',
          startTime: 0,
          duration: 2.0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 0.9, panX: 0, panY: 0, perspective: 1000 },
        },
      ],
    };

    const encoded = encodeProjectToUrl(blankProject);
    const decoded = decodeProjectFromUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.mediaType).toBe('blank');
    expect(decoded?.mediaName).toBe('Blank Canvas');
  });

  it('gracefully returns null for empty or invalid parameter strings without throwing', () => {
    expect(decodeProjectFromUrl('')).toBeNull();
    expect(decodeProjectFromUrl('invalid-base64-garbage!')).toBeNull();
    expect(decodeProjectFromUrl('null')).toBeNull();
  });
});
