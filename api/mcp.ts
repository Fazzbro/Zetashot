import zlib from 'node:zlib';

interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image' | 'transparent';
  color?: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain' | 'fill';
  imageScale?: number;
  opacity?: number;
}

interface TimelinePositionClip {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  color?: string;
  blockId?: string;
  mediaClipId?: string;
  transition?: string;
  camera: {
    rotX: number;
    rotY: number;
    rotZ: number;
    zoom: number;
    panX: number;
    panY: number;
    perspective?: number;
  };
}

interface ZetashotSharedProject {
  version: string;
  title?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
  background?: BackgroundConfig;
  cameraClips?: TimelinePositionClip[];
  deviceMockup?: string;
  duration?: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | '3d';
  mediaName?: string;
  autoExport?: boolean;
  textLayers?: Array<{
    id: string;
    text: string;
    title?: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
    borderRadius: number;
    paddingX: number;
    paddingY: number;
    opacity: number;
    startTime: number;
    duration: number;
    animationType: string;
  }>;
}

function encodeProjectToUrl(payload: ZetashotSharedProject): string {
  try {
    const jsonStr = JSON.stringify(payload);
    const compressed = zlib.deflateRawSync(Buffer.from(jsonStr, 'utf-8'));
    return compressed.toString('base64url');
  } catch (err) {
    console.warn('[Zetashot] Failed to encode project:', err);
    return '';
  }
}

// Available wallpapers catalog with calibrated default center points
const WALLPAPER_PRESETS = [
  { id: 'bg-purple-wave', name: 'Purple Wave (Vibrant Dark Flow)', path: '/backgrounds/bg-purple-wave.jpg', position: { x: 50, y: 50 } },
  { id: 'bg-sunflowers', name: 'Sunflower Meadow (Warm Summer Light)', path: '/backgrounds/bg-sunflowers.png', position: { x: 50, y: 100 } },
  { id: 'bg-green-hills', name: 'Green Hills (Minimalist Landscape)', path: '/backgrounds/bg-green-hills.jpg', position: { x: 50, y: 50 } },
  { id: 'bg-halftone-clouds', name: 'Halftone Clouds (Retro Pop Art)', path: '/backgrounds/bg-halftone-clouds.jpg', position: { x: 50, y: 50 } },
  { id: 'bg-tulips', name: 'Digital Tulips (Cyber Floral)', path: '/backgrounds/bg-tulips.jpg', position: { x: 50, y: 50 } },
];

const CAMERA_PRESETS = [
  { id: 'insane_3d_flyby', name: 'Insane 3D Flyby (High-Energy Dutch Roll & Swoop)', description: 'Extreme dynamic 3D camera flyby with Dutch angle rolls, wide sweeps, and close-up tracking' },
  { id: 'spiral_vortex_dive', name: 'Spiral Vortex Dive', description: 'Corkscrew 3D spiral diving in from deep space into an intense dynamic hero framing' },
  { id: 'push_in_reveal', name: 'Push-In Reveal (Dramatic Hero Zoom)', description: 'Smooth push from 0.74x distance into 1.35x close-up framing' },
  { id: 'tiktok_dynamic_bounce', name: 'TikTok / Reel Kinetic Bounce', description: 'Fast snappy rotational tilt designed for 9:16 vertical video engagement' },
  { id: 'cinematic_orbit', name: 'Cinematic Orbit (Dynamic 3D Yaw & Tilt)', description: 'Sweeps camera around the 3D model with subtle depth curvature' },
  { id: 'subtle_studio_hover', name: 'Subtle Studio Hover', description: 'Gentle, minimalist drift suited for elegant SaaS product showcases' },
];

function buildCameraClips(preset: string, duration: number): TimelinePositionClip[] {
  const dur = Math.max(2.0, Math.min(30.0, duration || 4.0));
  const t1 = Number((dur * 0.33).toFixed(2));
  const t2 = Number((dur * 0.66).toFixed(2));
  const d1 = t1;
  const d2 = Number((t2 - t1).toFixed(2));
  const d3 = Number((dur - t2).toFixed(2));

  const baseProps = { color: 'yellow', blockId: 'block_main', mediaClipId: 'clip_init', transition: 'cut' };

  switch (preset) {
    case 'insane_3d_flyby':
      return [
        {
          id: 'kf_1',
          name: 'High Dutch Swoop',
          startTime: 0,
          duration: d1,
          camera: { rotX: 34, rotY: -48, rotZ: -14, zoom: 0.76, panX: -35, panY: -20, perspective: 700 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: 'Low Dutch Punch',
          startTime: t1,
          duration: d2,
          camera: { rotX: -16, rotY: 36, rotZ: 16, zoom: 1.40, panX: 25, panY: 15, perspective: 700 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: 'Whip Reverse',
          startTime: t2,
          duration: d3,
          camera: { rotX: 22, rotY: -24, rotZ: -8, zoom: 1.15, panX: -15, panY: 5, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: 'Hero Center',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'spiral_vortex_dive':
      return [
        {
          id: 'kf_1',
          name: 'Deep Vortex Start',
          startTime: 0,
          duration: d1,
          camera: { rotX: 42, rotY: -65, rotZ: -28, zoom: 0.68, panX: -40, panY: -30, perspective: 650 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: 'Vortex Mid Swoop',
          startTime: t1,
          duration: d2,
          camera: { rotX: -24, rotY: 48, rotZ: 22, zoom: 1.32, panX: 30, panY: 15, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: 'Leveling In',
          startTime: t2,
          duration: d3,
          camera: { rotX: 12, rotY: -14, rotZ: -6, zoom: 1.12, panX: -10, panY: 0, perspective: 900 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: 'Final Hero Lock',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.0, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'push_in_reveal':
      return [
        {
          id: 'kf_start',
          name: 'Hero In',
          startTime: 0,
          duration: d1 + d2,
          camera: { rotX: 18, rotY: -22, rotZ: -6, zoom: 0.74, panX: -20, panY: -10, perspective: 800 },
          ...baseProps,
        },
        {
          id: 'kf_mid',
          name: 'Close Glide',
          startTime: t2,
          duration: d3,
          camera: { rotX: 6, rotY: 6, rotZ: 2, zoom: 1.28, panX: 10, panY: 0, perspective: 950 },
          ...baseProps,
        },
        {
          id: 'kf_end',
          name: 'Close Up',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.35, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'tiktok_dynamic_bounce':
      return [
        {
          id: 'kf_1',
          name: 'Top Right Angle',
          startTime: 0,
          duration: d1,
          camera: { rotX: 28, rotY: -35, rotZ: -12, zoom: 0.88, panX: -25, panY: -15, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: 'Low Left Punch',
          startTime: t1,
          duration: d2,
          camera: { rotX: -16, rotY: 30, rotZ: 10, zoom: 1.38, panX: 28, panY: 12, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: 'Snap Tilt',
          startTime: t2,
          duration: d3,
          camera: { rotX: 14, rotY: -12, rotZ: -4, zoom: 1.12, panX: -10, panY: -5, perspective: 900 },
          ...baseProps,
        },
        {
          id: 'kf_4',
          name: 'Final Center',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'subtle_studio_hover':
      return [
        {
          id: 'kf_1',
          name: 'Hover Left',
          startTime: 0,
          duration: dur,
          camera: { rotX: 8, rotY: -10, rotZ: 0, zoom: 0.98, panX: -15, panY: -5, perspective: 1000 },
          ...baseProps,
        },
        {
          id: 'kf_2',
          name: 'Hover Right',
          startTime: dur,
          duration: 0,
          camera: { rotX: 10, rotY: 8, rotZ: 0, zoom: 1.04, panX: 15, panY: 5, perspective: 1000 },
          ...baseProps,
        },
      ];

    case 'cinematic_orbit':
    default:
      return [
        {
          id: 'kf_start',
          name: 'Orbit In',
          startTime: 0,
          duration: d1,
          camera: { rotX: 24, rotY: -38, rotZ: -8, zoom: 0.85, panX: -25, panY: -10, perspective: 750 },
          ...baseProps,
        },
        {
          id: 'kf_mid',
          name: 'Center Pan',
          startTime: t1,
          duration: d2,
          camera: { rotX: -10, rotY: 15, rotZ: 5, zoom: 1.25, panX: 15, panY: 8, perspective: 850 },
          ...baseProps,
        },
        {
          id: 'kf_3',
          name: 'Orbit Swirl',
          startTime: t2,
          duration: d3,
          camera: { rotX: 16, rotY: -18, rotZ: -4, zoom: 1.10, panX: -8, panY: -2, perspective: 950 },
          ...baseProps,
        },
        {
          id: 'kf_end',
          name: 'Orbit Out',
          startTime: dur,
          duration: 0,
          camera: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1.05, panX: 0, panY: 0, perspective: 1000 },
          ...baseProps,
        },
      ];
  }
}

// Tool definitions for MCP tools/list
const TOOLS = [
  {
    name: 'create_mockup_project',
    description: 'Creates a custom 3D device mockup scene in Zetashot Studio and returns a direct 1-click live link to preview at 60 FPS or export to 4K MP4.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Project title (e.g. "SaaS Product Showcase", "Mobile App Teaser")',
        },
        aspectRatio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:5', '21:9'],
          default: '16:9',
          description: 'Video canvas aspect ratio: 16:9 (Landscape / YouTube), 9:16 (Vertical TikTok/Reels), 1:1 (Square), 4:5 (Instagram), 21:9 (Ultrawide)',
        },
        background: {
          type: 'string',
          default: 'bg-purple-wave',
          description: 'Wallpaper preset ("bg-purple-wave", "bg-sunflowers", "bg-green-hills", "bg-halftone-clouds", "bg-tulips") or hex color (e.g. "#09090b")',
        },
        deviceMockup: {
          type: 'string',
          enum: ['3d-phone', 'macbook-pro', 'ipad-pro', 'studio-display', 'mac-safari', 'frameless'],
          default: '3d-phone',
          description: 'Device model or container frame',
        },
        cameraPreset: {
          type: 'string',
          enum: ['insane_3d_flyby', 'spiral_vortex_dive', 'push_in_reveal', 'tiktok_dynamic_bounce', 'cinematic_orbit', 'subtle_studio_hover'],
          default: 'insane_3d_flyby',
          description: 'Camera trajectory motion preset. "insane_3d_flyby" and "spiral_vortex_dive" deliver extreme high-energy Dutch tilts and swooping 3D angles.',
        },
        textTitle: {
          type: 'string',
          description: 'Primary text overlay badge or title',
        },
        textSubtitle: {
          type: 'string',
          description: 'Secondary subtitle or descriptive tagline',
        },
        duration: {
          type: 'number',
          default: 4.0,
          description: 'Duration of the mockup sequence in seconds (2.0 to 15.0)',
        },
        mediaUrl: {
          type: 'string',
          description: 'URL or path to an image/video to display on the 3D device screen. Supports web URLs (https://...), project public folder paths or filenames (e.g. "D:\\mockup\\public\\default-codex-image.png", "default-codex-image.png", or "/default-codex-image.png"), and data URLs.',
        },
        mediaTitle: {
          type: 'string',
          description: 'Optional display name or title for the media/screen item',
        },
        autoExport: {
          type: 'boolean',
          default: true,
          description: 'If true (default), immediately initiates automatic 4K 60FPS MP4 video rendering and download when the link is opened in the browser.',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_available_presets',
    description: 'Lists all available wallpapers, 3D device frames, aspect ratios, and camera movement presets supported by Zetashot.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_shareable_link',
    description: 'Generates a direct Zetashot interactive URL for any given project parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:5', '21:9'] },
        background: { type: 'string' },
        deviceMockup: { type: 'string' },
        cameraPreset: { type: 'string' },
        title: { type: 'string' },
        mediaUrl: { type: 'string' },
        autoExport: { type: 'boolean' },
      },
    },
  },
];

function handleCreateProject(args: Record<string, unknown>, baseUrl: string) {
  const title = (args.title as string) || 'Zetashot Studio Project';
  const aspectRatio = (args.aspectRatio as '16:9' | '9:16' | '1:1' | '4:5' | '21:9') || '16:9';
  const bgInput = (args.background as string) || 'bg-purple-wave';
  const deviceMockup = (args.deviceMockup as string) || '3d-phone';
  const cameraPreset = (args.cameraPreset as string) || (aspectRatio === '9:16' ? 'tiktok_dynamic_bounce' : 'insane_3d_flyby');
  const duration = Math.max(2.0, Math.min(15.0, Number(args.duration) || 4.0));
  const autoExport = args.autoExport !== false; // defaults to true!

  const matchedWallpaper = WALLPAPER_PRESETS.find((w) => w.id === bgInput);
  const isImage = !!matchedWallpaper || bgInput.startsWith('bg-') || bgInput.endsWith('.jpg') || bgInput.endsWith('.png');

  const backgroundConfig: BackgroundConfig = isImage
    ? {
        type: 'image',
        imageUrl: matchedWallpaper ? matchedWallpaper.path : `/backgrounds/${bgInput}.jpg`,
        imageFit: 'cover',
        imageScale: 1.0,
        position: matchedWallpaper?.position || { x: 50, y: 50 },
        opacity: 1,
      }
    : {
        type: 'solid',
        color: bgInput.startsWith('#') ? bgInput : '#09090b',
        opacity: 1,
      };

  const cameraClips = buildCameraClips(cameraPreset, duration);

  const payload: ZetashotSharedProject = {
    version: '1.0.0',
    title,
    aspectRatio,
    background: backgroundConfig,
    deviceMockup,
    cameraClips,
    duration,
    autoExport,
  };

  let rawMediaUrl = (args.mediaUrl as string)?.trim();
  if (rawMediaUrl) {
    let resolvedMediaUrl = rawMediaUrl;
    const normalized = rawMediaUrl.replace(/\\/g, '/');
    const pubIdx = normalized.toLowerCase().indexOf('/public/');
    if (pubIdx !== -1) {
      resolvedMediaUrl = normalized.substring(pubIdx + '/public'.length);
    } else if (normalized.toLowerCase().startsWith('public/')) {
      resolvedMediaUrl = '/' + normalized.substring('public/'.length);
    } else if (!resolvedMediaUrl.startsWith('http://') && !resolvedMediaUrl.startsWith('https://') && !resolvedMediaUrl.startsWith('/') && !resolvedMediaUrl.startsWith('data:')) {
      resolvedMediaUrl = '/' + resolvedMediaUrl;
    }
    payload.mediaUrl = resolvedMediaUrl;
    payload.mediaName = (args.mediaTitle as string) || (resolvedMediaUrl.split('/').pop()?.split('?')[0] || 'Custom Screen Media');
    payload.mediaType = resolvedMediaUrl.endsWith('.mp4') || resolvedMediaUrl.endsWith('.webm') ? 'video' : 'image';
  }

  if (args.textTitle || args.textSubtitle) {
    payload.textLayers = [
      {
        id: `text_${Date.now()}`,
        text: (args.textTitle as string) || '',
        title: (args.textSubtitle as string) || '',
        x: 50,
        y: 85,
        fontSize: 32,
        fontFamily: "'Geist', Inter, sans-serif",
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12,
        paddingX: 20,
        paddingY: 10,
        opacity: 1,
        startTime: 0,
        duration,
        animationType: 'fade',
      },
    ];
  }

  const encodedParam = encodeProjectToUrl(payload);
  const shareUrl = `${baseUrl}/?p=${encodedParam}${autoExport ? '&export=mp4' : ''}`;

  const md = `### 🎬 Zetashot Mockup Created Successfully!

- **Project**: **${title}**
- **Aspect Ratio**: \`${aspectRatio}\`
- **Device Frame**: \`${deviceMockup}\`
- **Background**: ${matchedWallpaper ? matchedWallpaper.name : `\`${bgInput}\``}
- **Camera Choreography**: \`${cameraPreset}\` (${duration}s duration, ${cameraClips.length} keyframes with 3D Dutch tilt & swoop)
${payload.mediaUrl ? `- **Screen Media**: \`${payload.mediaUrl}\`` : ''}
${args.textTitle ? `- **Text Title**: "${args.textTitle}"` : ''}
- **MP4 Auto-Export**: \`${autoExport ? 'Enabled (Instant 4K 60FPS MP4 render & download)' : 'Manual'}\`

👉 **[Open in Zetashot Studio & Download MP4](${shareUrl})**

*Click the link above to view your interactive 3D camera mockup looping at 60 FPS and download the high-resolution 4K MP4 video directly!*`;

  return {
    content: [{ type: 'text', text: md }],
    shareUrl,
  };
}

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || '*';

  // Permissive CORS Headers for Claude.ai and Claude Desktop
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, mcp-session-id, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Derive origin URL for link generation
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'zetashot.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${proto}://${host}`;

  // Handle GET requests (SSE Stream or Service Discovery)
  if (req.method === 'GET') {
    const acceptHeader = (req.headers.accept || '').toLowerCase();
    const isSSE = acceptHeader.includes('text/event-stream') || req.query?.sse === 'true';

    if (isSSE) {
      // SSE Transport handshake for Claude
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      });

      // Send initial endpoint URI event
      res.write(`event: endpoint\ndata: ${baseUrl}/api/mcp\n\n`);

      // Keep stream alive with periodic heartbeats
      const interval = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch {
          clearInterval(interval);
        }
      }, 15000);

      req.on('close', () => {
        clearInterval(interval);
      });
      return;
    }

    // Human-friendly browser landing
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        {
          name: 'Zetashot MCP Server',
          version: '1.0.0',
          status: 'online',
          description: 'Model Context Protocol (MCP) server for Zetashot 3D Mockup Studio',
          endpoint: `${baseUrl}/api/mcp`,
          tools: TOOLS.map((t) => t.name),
          claude_connector_instructions: {
            step1: 'In Claude, go to Settings -> Connectors -> Add Custom Connector',
            step2: 'Set Name: Zetashot',
            step3: `Set MCP Server URL: ${baseUrl}/api/mcp`,
          },
        },
        null,
        2
      )
    );
    return;
  }

  // Handle POST requests (JSON-RPC Protocol)
  if (req.method === 'POST') {
    let body: any = req.body;

    // Parse body if received as raw stream / buffer
    if (!body || typeof body !== 'object') {
      try {
        const raw = await new Promise<string>((resolve) => {
          let str = '';
          req.on('data', (chunk: any) => (str += chunk));
          req.on('end', () => resolve(str));
        });
        body = raw ? JSON.parse(raw) : {};
      } catch (e) {
        body = {};
      }
    }

    const { id, method, params } = body || {};

    // Standard MCP JSON-RPC routing
    switch (method) {
      case 'initialize':
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: { listChanged: false },
              },
              serverInfo: {
                name: 'Zetashot 3D Mockup Studio',
                version: '1.0.0',
              },
            },
          })
        );
        return;

      case 'notifications/initialized':
        res.statusCode = 200;
        res.end();
        return;

      case 'ping':
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ jsonrpc: '2.0', id, result: {} }));
        return;

      case 'tools/list':
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: {
              tools: TOOLS,
            },
          })
        );
        return;

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (toolName === 'create_mockup_project') {
          const result = handleCreateProject(toolArgs, baseUrl);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: result.content,
              },
            })
          );
          return;
        }

        if (toolName === 'list_available_presets') {
          const summary = `### 🎨 Zetashot Presets Catalog

#### 🖼️ Wallpaper Presets
${WALLPAPER_PRESETS.map((w) => `- **\`${w.id}\`**: ${w.name}`).join('\n')}

#### 🎥 3D Camera Trajectories
${CAMERA_PRESETS.map((c) => `- **\`${c.id}\`**: ${c.name} — *${c.description}*`).join('\n')}

#### 📱 Device Mockup Frames
- **\`3d-phone\`**: Interactive 3D phone with specular glass, camera island, and studio lighting
- **\`macbook-pro\`**: Apple MacBook Pro aluminum laptop frame
- **\`ipad-pro\`**: iPad Pro tablet frame
- **\`studio-display\`**: Apple Studio Display cinema frame
- **\`mac-safari\`**: Desktop browser window with macOS traffic lights and URL bar
- **\`frameless\`**: Clean borderless viewport

#### 📐 Aspect Ratios
- \`16:9\` (YouTube / Landscape)
- \`9:16\` (TikTok / Reels / Shorts)
- \`1:1\` (Square Feed)
- \`4:5\` (Instagram Portrait)
- \`21:9\` (Cinematic Ultrawide)`;

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: summary }],
              },
            })
          );
          return;
        }

        if (toolName === 'get_shareable_link') {
          const result = handleCreateProject(toolArgs, baseUrl);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: `Link: ${result.shareUrl}` }],
              },
            })
          );
          return;
        }

        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${toolName}`,
            },
          })
        );
        return;
      }

      default:
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown method: ${method}`,
            },
          })
        );
        return;
    }
  }

  res.statusCode = 405;
  res.end('Method Not Allowed');
}
