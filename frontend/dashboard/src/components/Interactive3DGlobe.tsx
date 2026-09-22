import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe2, Compass, MapPin, Layers, ExternalLink, BookOpen,
  RotateCcw, Play, Pause, ZoomIn, ZoomOut, Maximize2, Minimize2,
  Sparkles, CheckCircle2, ShieldCheck, Building, ChevronRight, X
} from 'lucide-react';

export interface GeoLocation {
  city?: string;
  state?: string;
  country?: string;
  country_code?: string;
  lat: number;
  lng: number;
  formatted?: string;
  extraction_confidence?: number;
  method?: string;
  origin_type?: string;
}

export interface GlobeSource {
  id?: string;
  title: string;
  snippet?: string;
  source?: string;
  domain?: string;
  url?: string;
  source_tier?: number;
  credibility_score?: number;
  location?: GeoLocation;
  [key: string]: any;
}

interface Interactive3DGlobeProps {
  sources: GlobeSource[];
  onSelectArticle?: (article: GlobeSource) => void;
  title?: string;
}

// Simplified continent landmass polygons for high-performance 3D canvas rendering
const WORLD_CONTINENTS: Array<Array<[number, number]>> = [
  // India & South Asia
  [
    [8.0, 77.5], [10.5, 79.8], [13.0, 80.3], [17.5, 83.3], [21.5, 87.0],
    [22.5, 89.0], [25.0, 92.0], [28.0, 96.0], [35.5, 77.0], [34.0, 74.0],
    [30.0, 70.0], [24.5, 68.0], [21.0, 70.0], [20.0, 73.0], [15.0, 74.0],
    [10.0, 76.0], [8.0, 77.5]
  ],
  // Sri Lanka
  [[6.0, 80.0], [9.5, 80.5], [8.5, 81.8], [6.0, 80.5], [6.0, 80.0]],
  // East & Southeast Asia / China / Japan
  [
    [22.0, 108.0], [24.0, 118.0], [31.0, 122.0], [37.0, 122.0], [40.0, 120.0],
    [40.0, 128.0], [45.0, 132.0], [53.0, 135.0], [50.0, 120.0], [42.0, 110.0],
    [45.0, 90.0], [40.0, 75.0], [30.0, 80.0], [25.0, 98.0], [15.0, 101.0],
    [10.0, 104.0], [1.5, 104.0], [8.0, 100.0], [15.0, 108.0], [22.0, 108.0]
  ],
  // Japan
  [[31.0, 130.5], [35.0, 136.0], [40.0, 140.0], [45.0, 142.0], [43.0, 145.0], [38.0, 141.0], [34.0, 132.0], [31.0, 130.5]],
  // Europe
  [
    [36.0, -5.5], [43.0, -9.0], [48.0, -4.5], [51.0, 2.0], [54.0, 8.0],
    [58.0, 11.0], [65.0, 12.0], [70.0, 28.0], [68.0, 45.0], [60.0, 50.0],
    [50.0, 40.0], [45.0, 35.0], [41.0, 29.0], [38.0, 24.0], [36.5, 22.0],
    [40.0, 18.0], [44.0, 12.0], [43.0, 7.0], [41.0, 2.0], [36.0, -5.5]
  ],
  // British Isles
  [[50.0, -5.0], [52.0, 1.5], [58.0, -3.0], [58.0, -6.0], [54.0, -3.0], [50.5, -4.0], [50.0, -5.0]],
  // Africa
  [
    [36.0, -5.0], [37.0, 10.0], [32.0, 32.0], [30.0, 32.5], [22.0, 37.0],
    [12.0, 44.0], [12.0, 51.0], [-1.0, 42.0], [-12.0, 40.0], [-25.0, 33.0],
    [-34.5, 20.0], [-34.0, 18.0], [-22.0, 14.0], [-5.0, 12.0], [4.0, 9.0],
    [5.0, 1.0], [4.5, -7.5], [12.0, -16.0], [21.0, -17.0], [30.0, -10.0], [36.0, -5.0]
  ],
  // Middle East
  [
    [30.0, 32.0], [33.0, 35.0], [37.0, 36.0], [37.0, 44.0], [30.0, 48.0],
    [26.0, 56.0], [23.0, 58.0], [16.0, 53.0], [13.0, 45.0], [20.0, 40.0],
    [28.0, 35.0], [30.0, 32.0]
  ],
  // North America
  [
    [25.0, -80.0], [30.0, -81.0], [35.0, -75.0], [45.0, -66.0], [50.0, -56.0],
    [60.0, -64.0], [70.0, -70.0], [72.0, -130.0], [65.0, -165.0], [58.0, -150.0],
    [48.0, -124.0], [35.0, -120.0], [23.0, -110.0], [18.0, -104.0], [15.0, -92.0],
    [20.0, -87.0], [25.0, -97.0], [30.0, -90.0], [25.0, -80.0]
  ],
  // South America
  [
    [12.0, -72.0], [10.0, -62.0], [5.0, -52.0], [-5.0, -35.0], [-15.0, -39.0],
    [-23.0, -43.0], [-34.0, -53.0], [-45.0, -65.0], [-55.0, -68.0], [-50.0, -75.0],
    [-30.0, -72.0], [-15.0, -75.0], [-5.0, -80.0], [8.0, -77.0], [12.0, -72.0]
  ],
  // Australia
  [
    [-12.0, 132.0], [-15.0, 145.0], [-25.0, 153.0], [-38.0, 145.0], [-35.0, 135.0],
    [-32.0, 116.0], [-22.0, 114.0], [-15.0, 125.0], [-12.0, 132.0]
  ]
];

export const Interactive3DGlobe: React.FC<Interactive3DGlobeProps> = ({
  sources,
  onSelectArticle,
  title = "3D Geo-Intelligence Globe"
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Rotation angles (degrees)
  // Default centered roughly around India / Asia
  const [rotationY, setRotationY] = useState<number>(-78);
  const [rotationX, setRotationX] = useState<number>(18);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Drag interaction state
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const animFrameIdRef = useRef<number | null>(null);

  // Hover & Active modal article
  const [hoveredPoint, setHoveredPoint] = useState<{ source: GlobeSource; screenX: number; screenY: number } | null>(null);
  const [activeModalSource, setActiveModalSource] = useState<GlobeSource | null>(null);
  const projectedPinsRef = useRef<Array<{ source: GlobeSource; x: number; y: number; z: number; radius: number }>>([]);

  // Filter sources with valid location coordinates
  const geoSources: GlobeSource[] = useMemo(() => {
    return sources.filter((s) => s.location && typeof s.location.lat === 'number' && typeof s.location.lng === 'number');
  }, [sources]);

  // Distinct locations for quick navigation pills
  const distinctLocations = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; formatted: string; count: number; tier: number }>();
    for (const s of geoSources) {
      if (!s.location) continue;
      const key = s.location.formatted || `${s.location.city || ''}, ${s.location.country || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          lat: s.location.lat,
          lng: s.location.lng,
          formatted: key,
          count: 1,
          tier: s.source_tier || 2,
        });
      } else {
        const item = map.get(key)!;
        item.count += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [geoSources]);

  // Smoothly rotate globe to face specific (lat, lng)
  const flyToLocation = useCallback((lat: number, lng: number) => {
    setIsAutoRotate(false);
    const targetY = -lng;
    const targetX = Math.max(-65, Math.min(65, lat));
    
    // Animate smoothly
    let startY = rotationY;
    let startX = rotationX;
    let progress = 0;
    const duration = 40;

    const animateFly = () => {
      progress += 1;
      const t = progress / duration;
      const ease = t * (2 - t); // ease-out
      setRotationY(startY + (targetY - startY) * ease);
      setRotationX(startX + (targetX - startX) * ease);

      if (progress < duration) {
        requestAnimationFrame(animateFly);
      }
    };
    animateFly();
  }, [rotationY, rotationX]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;
    let pulseAngle = 0;

    const render = () => {
      if (!isMounted) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.38;
      const R = baseRadius * zoom;

      const rotYRad = (rotationY * Math.PI) / 180;
      const rotXRad = (rotationX * Math.PI) / 180;

      // Projection helper: (lat, lng) -> 3D sphere -> 2D screen coordinates
      const project = (lat: number, lng: number): { x: number; y: number; z: number; visible: boolean } => {
        const phi = (lat * Math.PI) / 180;
        const theta = ((lng + rotationY) * Math.PI) / 180;
        const pitch = rotXRad;

        // 3D Cartesian coordinates
        const x3 = Math.cos(phi) * Math.sin(theta);
        const y3 = Math.sin(phi);
        const z3 = Math.cos(phi) * Math.cos(theta);

        // Apply pitch (rotationX)
        const y_pitched = y3 * Math.cos(pitch) - z3 * Math.sin(pitch);
        const z_pitched = y3 * Math.sin(pitch) + z3 * Math.cos(pitch);

        const screenX = cx + R * x3;
        const screenY = cy - R * y_pitched;

        return {
          x: screenX,
          y: screenY,
          z: z_pitched,
          visible: z_pitched > -0.05,
        };
      };

      // 1. Draw Globe Outer Atmospheric Glow
      const glowGrad = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.18);
      glowGrad.addColorStop(0, 'rgba(99, 102, 241, 0.12)');
      glowGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.08)');
      glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // 2. Draw Sphere Background (Clean Enterprise Ocean)
      const oceanGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
      oceanGrad.addColorStop(0, '#f8fafc');
      oceanGrad.addColorStop(0.65, '#e0e7ff');
      oceanGrad.addColorStop(0.95, '#c7d2fe');
      oceanGrad.addColorStop(1, '#a5b4fc');

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = oceanGrad;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#818cf8';
      ctx.stroke();
      ctx.clip(); // Clip everything inside globe sphere

      // 3. Draw Graticule Lines (Latitude Parallels & Longitude Meridians)
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
      ctx.lineWidth = 1;

      // Parallels (-60 to 60)
      const parallels = [-60, -30, 0, 30, 60];
      for (const lat of parallels) {
        ctx.beginPath();
        let first = true;
        for (let lng = -180; lng <= 180; lng += 4) {
          const pt = project(lat, lng);
          if (pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // Meridians (-180 to 180)
      const meridians = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];
      for (const lng of meridians) {
        ctx.beginPath();
        let first = true;
        for (let lat = -80; lat <= 80; lat += 4) {
          const pt = project(lat, lng);
          if (pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // Equator Highlight
      ctx.beginPath();
      let eqFirst = true;
      for (let lng = -180; lng <= 180; lng += 3) {
        const pt = project(0, lng);
        if (pt.visible) {
          if (eqFirst) {
            ctx.moveTo(pt.x, pt.y);
            eqFirst = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        } else {
          eqFirst = true;
        }
      }
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 4. Draw World Continents
      ctx.fillStyle = 'rgba(203, 213, 225, 0.75)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.lineWidth = 1.2;

      for (const continent of WORLD_CONTINENTS) {
        ctx.beginPath();
        let first = true;
        for (const [lat, lng] of continent) {
          const pt = project(lat, lng);
          if (pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 5. Draw 3D Shading & Sphere Specular Gradient Overlay
      const sphereShade = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.45, R * 0.05, cx, cy, R);
      sphereShade.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      sphereShade.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
      sphereShade.addColorStop(1, 'rgba(15, 23, 42, 0.35)');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = sphereShade;
      ctx.fill();

      ctx.restore(); // End clipping

      // 6. Project and Render Source Pinpoints
      const currentProjectedPins: Array<{ source: GlobeSource; x: number; y: number; z: number; radius: number }> = [];
      pulseAngle = (pulseAngle + 0.06) % (Math.PI * 2);

      for (const src of geoSources) {
        if (!src.location) continue;
        const pt = project(src.location.lat, src.location.lng);

        if (pt.z > 0.02) {
          // Point is on visible front hemisphere
          const tier = src.source_tier || 2;
          const pinColor = tier === 1 ? '#10b981' : tier === 2 ? '#4f46e5' : '#f59e0b';
          const pinGlow = tier === 1 ? 'rgba(16, 185, 129,' : tier === 2 ? 'rgba(79, 70, 229,' : 'rgba(245, 158, 11,';

          // Perspective scaling
          const zScale = 0.8 + 0.4 * pt.z;
          const pinRadius = 6 * zScale;
          const pulseR = pinRadius + Math.sin(pulseAngle) * 4 * zScale + 3;

          currentProjectedPins.push({
            source: src,
            x: pt.x,
            y: pt.y,
            z: pt.z,
            radius: pinRadius + 6,
          });

          // Draw Outer Pulsing Beacon Radar Ring
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(2, pulseR), 0, Math.PI * 2);
          ctx.strokeStyle = `${pinGlow} 0.55)`;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Draw Inner Pin Core
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pinRadius, 0, Math.PI * 2);
          ctx.fillStyle = pinColor;
          ctx.shadowColor = pinColor;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          // White center dot
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pinRadius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Small location city tag if facing directly forward (z > 0.4)
          if (pt.z > 0.35 && src.location.city) {
            ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.strokeText(src.location.city, pt.x + pinRadius + 4, pt.y + 3);
            ctx.fillText(src.location.city, pt.x + pinRadius + 4, pt.y + 3);
          }
        }
      }

      projectedPinsRef.current = currentProjectedPins;

      // 7. Auto-rotation step
      if (isAutoRotate && !isDraggingRef.current) {
        setRotationY((prev) => (prev + 0.35) % 360);
      }

      // Inertia after drag release
      if (!isDraggingRef.current && (Math.abs(velocityRef.current.vx) > 0.01 || Math.abs(velocityRef.current.vy) > 0.01)) {
        setRotationY((prev) => (prev + velocityRef.current.vx) % 360);
        setRotationX((prev) => Math.max(-75, Math.min(75, prev + velocityRef.current.vy)));
        velocityRef.current.vx *= 0.92;
        velocityRef.current.vy *= 0.92;
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [rotationY, rotationX, zoom, isAutoRotate, geoSources]);

  // Resize canvas to match display container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  // Pointer drag & rotation handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { vx: 0, vy: 0 };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;

      const rotSpeed = 0.55 / zoom;
      const newVx = dx * rotSpeed;
      const newVy = -dy * rotSpeed;

      velocityRef.current = { vx: newVx, vy: newVy };
      setRotationY((prev) => (prev + newVx) % 360);
      setRotationX((prev) => Math.max(-75, Math.min(75, prev + newVy)));

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setHoveredPoint(null);
    } else {
      // Check for hover over pins
      let found: GlobeSource | null = null;
      for (const pin of projectedPinsRef.current) {
        const dist = Math.hypot(pin.x - mouseX, pin.y - mouseY);
        if (dist <= pin.radius + 6) {
          found = pin.source;
          break;
        }
      }

      if (found) {
        setHoveredPoint({ source: found, screenX: mouseX, screenY: mouseY });
      } else {
        setHoveredPoint(null);
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked a pin
    for (const pin of projectedPinsRef.current) {
      const dist = Math.hypot(pin.x - clickX, pin.y - clickY);
      if (dist <= pin.radius + 8) {
        setActiveModalSource(pin.source);
        setIsAutoRotate(false);
        break;
      }
    }
  };

  // Touch handlers for mobile / tablet
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      velocityRef.current = { vx: 0, vy: 0 };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current && e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastMousePosRef.current.x;
      const dy = e.touches[0].clientY - lastMousePosRef.current.y;
      const rotSpeed = 0.55 / zoom;
      const newVx = dx * rotSpeed;
      const newVy = -dy * rotSpeed;

      velocityRef.current = { vx: newVx, vy: newVy };
      setRotationY((prev) => (prev + newVx) % 360);
      setRotationX((prev) => Math.max(-75, Math.min(75, prev + newVy)));

      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6 transition-all">
      {/* Header Bar */}
      <div className="px-4 py-3.5 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Globe2 className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{geoSources.length} True Geocoded Sources</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Rotatable 360° interactive Earth sphere. Hover or click pins to inspect localized reporting.
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs">
          <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`p-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1 ${
              isAutoRotate ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={isAutoRotate ? 'Pause 360° Auto-Rotation' : 'Resume 360° Auto-Rotation'}
          >
            {isAutoRotate ? <Pause className="w-3.5 h-3.5 text-indigo-600" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">{isAutoRotate ? 'Rotating' : 'Spin'}</span>
          </button>

          <button
            onClick={() => {
              setZoom((prev) => Math.min(1.4, prev + 0.1));
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setZoom((prev) => Math.max(0.75, prev - 0.1));
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setRotationY(-78);
              setRotationX(18);
              setZoom(1.0);
              setIsAutoRotate(true);
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer flex items-center space-x-1"
            title="Reset View to India / Asia"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title={isExpanded ? 'Compact View' : 'Expand View'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick City Navigation Pills */}
      {distinctLocations.length > 0 && (
        <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar">
          <span className="text-slate-500 font-semibold flex-shrink-0 flex items-center space-x-1 text-[11px]">
            <MapPin className="w-3 h-3 text-indigo-600" />
            <span>Locations:</span>
          </span>
          {distinctLocations.map((loc, idx) => (
            <button
              key={idx}
              onClick={() => flyToLocation(loc.lat, loc.lng)}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 font-medium transition flex items-center space-x-1 flex-shrink-0 shadow-2xs cursor-pointer"
              title={`Spin globe directly to ${loc.formatted}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                loc.tier === 1 ? 'bg-emerald-500' : loc.tier === 2 ? 'bg-indigo-600' : 'bg-amber-500'
              }`} />
              <span>{loc.formatted}</span>
              <span className="text-[10px] text-slate-400 font-mono">({loc.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Globe Canvas Container */}
      <div
        ref={containerRef}
        className={`relative w-full bg-radial from-slate-50 via-indigo-50/20 to-slate-100 flex items-center justify-center select-none cursor-grab active:cursor-grabbing ${
          isExpanded ? 'h-[480px]' : 'h-[360px]'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full block"
        />

        {/* 360° Drag Helper Watermark */}
        <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-xs border border-slate-200/80 px-2.5 py-1 rounded-lg text-[11px] text-slate-600 flex items-center space-x-1.5 pointer-events-none shadow-xs">
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>Drag 360° to rotate • Click pin to inspect</span>
        </div>

        {/* Legend */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs border border-slate-200 px-3 py-2 rounded-xl text-[11px] space-y-1 shadow-sm pointer-events-none">
          <div className="font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-1">Source Tiers</div>
          <div className="flex items-center space-x-1.5 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
            <span>Tier 1 (Gov / Major Wire)</span>
          </div>
          <div className="flex items-center space-x-1.5 text-indigo-800">
            <span className="w-2 h-2 rounded-full bg-indigo-600 shadow-xs" />
            <span>Tier 2 (Mainstream News)</span>
          </div>
          <div className="flex items-center space-x-1.5 text-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
            <span>Tier 3 (Local / Video / Social)</span>
          </div>
        </div>

        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredPoint && !activeModalSource && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                left: Math.min(hoveredPoint.screenX + 15, (containerRef.current?.clientWidth || 400) - 240),
                top: Math.max(15, hoveredPoint.screenY - 45),
              }}
              className="absolute pointer-events-none z-20 w-60 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 rounded-xl p-3 shadow-xl"
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-bold text-indigo-300 flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span>{hoveredPoint.source.location?.formatted || 'Geocoded Location'}</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Tier {hoveredPoint.source.source_tier || 2}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-100 line-clamp-2 mb-1">
                {hoveredPoint.source.title}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>{hoveredPoint.source.source || hoveredPoint.source.domain}</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  Trust: {Math.round((hoveredPoint.source.credibility_score || 0.8) * 100)}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Pin Click Article Popup Modal */}
      <AnimatePresence>
        {activeModalSource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200 flex items-start justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-700 flex items-center space-x-1.5">
                      <span>{activeModalSource.location?.formatted || 'Verified Geolocation'}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 font-normal">
                        ({activeModalSource.location?.lat.toFixed(4)}°, {activeModalSource.location?.lng.toFixed(4)}°)
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mt-0.5">
                      {activeModalSource.title}
                    </h4>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModalSource(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-3.5 text-xs text-slate-700">
                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md font-bold ${
                    activeModalSource.source_tier === 1 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    activeModalSource.source_tier === 2 ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                    'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    Tier {activeModalSource.source_tier || 2} Source
                  </span>

                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                    Publisher: {activeModalSource.source || activeModalSource.domain || 'Global Press'}
                  </span>

                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                    Trust: {Math.round((activeModalSource.credibility_score || 0.85) * 100)}%
                  </span>
                </div>

                {/* Journalistic snippet */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {activeModalSource.snippet || 'Reporting on verified intelligence development.'}
                </div>

                {/* Geolocation Dateline Method */}
                {activeModalSource.location?.method && (
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Extracted via <strong>{activeModalSource.location.method.replace('_', ' ')}</strong> (Confidence: {Math.round((activeModalSource.location.extraction_confidence || 0.95) * 100)}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2.5">
                {onSelectArticle && (
                  <button
                    onClick={() => {
                      const src = activeModalSource;
                      setActiveModalSource(null);
                      onSelectArticle(src);
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Inspect Full Source Dossier</span>
                  </button>
                )}

                {activeModalSource.url && (
                  <a
                    href={activeModalSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold flex items-center space-x-1.5 transition"
                  >
                    <span>Open External Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
