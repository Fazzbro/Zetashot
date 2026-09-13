export type TextFontFamily = 'SF Pro Display' | 'Helvetica' | 'Poppins';

export type TextAnimationType = 'none' | 'fade' | 'slide-up' | 'slide-down' | 'pop';

export interface TextLayerOverlay {
  id: string;
  text: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  x: number; // normalized percentage 0..100 across stage
  y: number; // normalized percentage 0..100 across stage
  fontSize: number; // base size in px (at 1920x1080 stage)
  fontFamily: TextFontFamily;
  fontWeight: 'normal' | '500' | '600' | '700' | 'bold';
  color: string; // hex or rgba
  textAlign: 'left' | 'center' | 'right';
  shadow?: boolean; // drop shadow (default: false / no shadow)
  inAnimation: TextAnimationType;
  inDuration: number; // seconds, e.g. 0.35
  outAnimation: TextAnimationType;
  outDuration: number; // seconds, e.g. 0.35
}

export interface TextLayerInterpolation {
  visible: boolean;
  opacity: number;
  translateY: number; // in px or percentage
  scale: number;
}
