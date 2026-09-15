export type BuiltinFontFamily = 'Sora' | 'SF Pro Display' | 'Helvetica' | 'Poppins';
export type TextFontFamily = BuiltinFontFamily | (string & {});

export type TextFontWeight =
  | '100'
  | '200'
  | '300'
  | '400'
  | 'normal'
  | '500'
  | '600'
  | '700'
  | 'bold'
  | '800';

export type TextAnimationType =
  | 'none'
  | 'fade'
  | 'fade-in-blur'
  | 'blur'
  | 'blur-sm'
  | 'scale'
  | 'slide'
  | 'slide-up'
  | 'slide-down'
  | 'pop'
  | 'scramble'
  | 'shimmer'
  | 'roll';

export type TextAnimationScope = 'all' | 'word' | 'char' | 'line';

export interface TextLayerOverlay {
  id: string;
  text: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  x: number; // normalized percentage 0..100 across stage
  y: number; // normalized percentage 0..100 across stage
  fontSize: number; // base size in px (at 1920x1080 stage)
  fontFamily: TextFontFamily;
  fontWeight: TextFontWeight;
  color: string; // hex or rgba
  textAlign: 'left' | 'center' | 'right';
  lineHeight?: number; // line spacing multiplier, e.g. 0.95 (range 0.7 .. 2.5)
  letterSpacing?: number; // character spacing in px, e.g. 0 (range -2 .. 16)
  shadow?: boolean; // drop shadow (default: false / no shadow)
  inAnimation: TextAnimationType;
  inDuration: number; // seconds, e.g. 0.35
  outAnimation: TextAnimationType;
  outDuration: number; // seconds, e.g. 0.35
  animationScope?: TextAnimationScope; // granularity: 'all' | 'word' | 'char' | 'line' (default: 'word')
}

export interface TextLayerInterpolation {
  visible: boolean;
  opacity: number;
  translateY: number; // in px or percentage
  translateX?: number;
  scale: number;
  blur?: number; // in px
  rotateX?: number; // in deg (3D roll)
  scrambleProgress?: number; // 0..1 progress for cryptographic scramble
  shimmerOffset?: number; // percentage offset for shimmer wave
  phase: 'in' | 'steady' | 'out' | 'hidden';
}
