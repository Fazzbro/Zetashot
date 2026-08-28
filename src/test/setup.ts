import '@testing-library/jest-dom';

// Polyfills for JSDOM
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
    window.URL.revokeObjectURL = () => {};
  }

  // Mock navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      write: async () => {},
      writeText: async () => {},
      readText: async () => '',
    },
    configurable: true,
  });

  // Mock OffscreenCanvas
  if (typeof OffscreenCanvas === 'undefined') {
    (globalThis as any).OffscreenCanvas = class MockOffscreenCanvas {
      width: number;
      height: number;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }
      getContext() {
        return {
          fillRect: () => {},
          clearRect: () => {},
          drawImage: () => {},
          getImageData: () => ({ data: new Uint8ClampedArray(4) }),
          putImageData: () => {},
          createImageData: () => ({ data: new Uint8ClampedArray(4) }),
          setTransform: () => {},
          scale: () => {},
          rotate: () => {},
          translate: () => {},
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          closePath: () => {},
          arc: () => {},
          stroke: () => {},
          fill: () => {},
        };
      }
      convertToBlob() {
        return Promise.resolve(new Blob(['mock-data'], { type: 'image/png' }));
      }
    };
  }
}
