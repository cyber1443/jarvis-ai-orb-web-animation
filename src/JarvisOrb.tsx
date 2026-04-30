"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { createRenderer, type Renderer } from "./renderer";
import {
  PALETTES,
  SIZE_PRESETS,
  resolvePalette,
  type JarvisPalette,
  type JarvisSize,
  type JarvisState,
} from "./states";

export type JarvisQuality = "auto" | "ultra" | "high" | "balanced" | "performance";

export interface JarvisOrbProps {
  size?: JarvisSize;
  state?: JarvisState;
  palette?: JarvisPalette;
  quality?: JarvisQuality;
  intensity?: number;
  paused?: boolean;
  interactive?: boolean;
  draggableSpin?: boolean;
  breathing?: boolean;
  breathingIntensity?: number;
  onPointerPulse?: () => void;
  className?: string;
  style?: Record<string, string | number | undefined>;
  ariaLabel?: string;
}

type ResolvedQuality = {
  particleScale: number;
  filamentScale: number;
  ringScale: number;
  maxDpr: number;
  targetFps: number;
  filamentFrameStride: number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function resolveQuality(size: JarvisSize, quality: JarvisQuality): ResolvedQuality {
  const rawDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const cores = typeof navigator === "undefined" ? 4 : navigator.hardwareConcurrency || 4;
  const memory = typeof navigator === "undefined"
    ? 4
    : ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4);
  const saveData = typeof navigator !== "undefined" && Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
  );
  const narrow = typeof window !== "undefined" && window.innerWidth < 768;

  let level: Exclude<JarvisQuality, "auto"> = quality === "auto" ? "high" : quality;
  if (quality === "auto") {
    if (saveData || cores <= 2 || memory <= 2) {
      level = "performance";
    } else if (narrow || rawDpr >= 2.75 || cores <= 4 || memory <= 4) {
      level = "balanced";
    }
  }

  if (level === "ultra") {
    return {
      particleScale: 1.18,
      filamentScale: 1.16,
      ringScale: 1.12,
      maxDpr: size === "avatar" ? 4 : size === "panel" ? 3.4 : 3.25,
      targetFps: 60,
      filamentFrameStride: 1,
    };
  }

  if (level === "performance") {
    return {
      particleScale: size === "avatar" ? 0.72 : 0.62,
      filamentScale: 0.58,
      ringScale: 0.7,
      maxDpr: size === "avatar" ? 2.1 : 1.3,
      targetFps: 38,
      filamentFrameStride: 2,
    };
  }

  if (level === "balanced") {
    return {
      particleScale: size === "avatar" ? 0.86 : 0.8,
      filamentScale: 0.78,
      ringScale: 0.84,
      maxDpr: size === "avatar" ? 2.5 : 1.65,
      targetFps: 48,
      filamentFrameStride: size === "hero" ? 2 : 1,
    };
  }

  return {
    particleScale: 1,
    filamentScale: 1,
    ringScale: 1,
    maxDpr: size === "avatar" ? 4 : size === "panel" ? 3 : 2.25,
    targetFps: 60,
    filamentFrameStride: 1,
  };
}

function scalePreset(base: typeof SIZE_PRESETS[JarvisSize], quality: ResolvedQuality) {
  return {
    ...base,
    particleCount: Math.max(96, Math.round(base.particleCount * quality.particleScale)),
    filamentCount: Math.max(14, Math.round(base.filamentCount * quality.filamentScale)),
    ringSegments: Math.max(80, Math.round(base.ringSegments * quality.ringScale)),
    dpr: Math.min(base.dpr, quality.maxDpr),
    minDpr: 1,
  };
}

export function JarvisOrb({
  size = "panel",
  state = "idle",
  palette = "cyan",
  quality = "auto",
  intensity,
  paused,
  interactive,
  draggableSpin = false,
  breathing = false,
  breathingIntensity = 1,
  onPointerPulse,
  className,
  style,
  ariaLabel = "Jarvis AI",
}: JarvisOrbProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const pulseHandlerRef = useRef(onPointerPulse);
  const [fallback, setFallback] = useState(false);

  const preset = SIZE_PRESETS[size];
  const isInteractive = interactive ?? size === "hero";

  useEffect(() => {
    pulseHandlerRef.current = onPointerPulse;
  }, [onPointerPulse]);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    setFallback(reduced);
    if (reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resolvedQuality = resolveQuality(size, quality);
    const renderPreset = scalePreset(preset, resolvedQuality);
    const renderDpr = Math.max(1, Math.min(window.devicePixelRatio || 1, renderPreset.dpr));

    let renderer: Renderer | null = null;
    try {
      renderer = createRenderer({
        canvas,
        preset: renderPreset,
        dpr: renderDpr,
        targetFps: resolvedQuality.targetFps,
        filamentFrameStride: resolvedQuality.filamentFrameStride,
        initialState: state,
        initialPalette: palette,
      });
    } catch {
      setFallback(true);
      return;
    }

    setFallback(false);
    rendererRef.current = renderer;

    let resizeRaf = 0;
    const scheduleResize = () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        renderer?.resize();
      });
    };

    const ro = new ResizeObserver(scheduleResize);
    if (containerRef.current) ro.observe(containerRef.current);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) renderer?.setPaused(!entry.isIntersecting);
      },
      { threshold: 0.01 },
    );
    if (containerRef.current) io.observe(containerRef.current);

    const onVis = () => renderer?.setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      renderer?.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, quality, size]);

  useEffect(() => {
    rendererRef.current?.setState(state);
  }, [state]);

  useEffect(() => {
    rendererRef.current?.setPalette(palette);
  }, [palette]);

  useEffect(() => {
    rendererRef.current?.setIntensityOverride(intensity ?? null);
  }, [intensity]);

  useEffect(() => {
    if (paused !== undefined) rendererRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    rendererRef.current?.setBreathing(breathing, breathingIntensity);
  }, [breathing, breathingIntensity]);

  const updatePointer = useCallback((event: PointerEvent<HTMLDivElement>, active: boolean) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
    rendererRef.current?.setPointer(x, y, active);
  }, []);

  const endSpinDrag = useCallback(() => {
    dragRef.current.active = false;
    rendererRef.current?.setSpinActive(false);
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    updatePointer(event, true);
    rendererRef.current?.pulse(1.18);
    pulseHandlerRef.current?.();

    if (!draggableSpin) return;
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
    rendererRef.current?.setSpinActive(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [draggableSpin, updatePointer]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    updatePointer(event, true);

    if (!draggableSpin || !dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
    rendererRef.current?.spinBy(dx, dy);
  }, [draggableSpin, updatePointer]);

  const handlePointerLeave = useCallback(() => {
    if (!dragRef.current.active) {
      rendererRef.current?.setPointer(0, 0, false);
    }
  }, []);

  const fallbackPalette = resolvePalette(palette);
  const stateKey = typeof state === "string" ? state : "custom";

  return (
    <div
      ref={containerRef}
      className={className}
      data-jarvis-orb-state={stateKey}
      onPointerEnter={isInteractive ? (event) => updatePointer(event, true) : undefined}
      onPointerMove={isInteractive ? handlePointerMove : undefined}
      onPointerLeave={isInteractive ? handlePointerLeave : undefined}
      onPointerDown={isInteractive ? handlePointerDown : undefined}
      onPointerUp={isInteractive && draggableSpin ? endSpinDrag : undefined}
      onPointerCancel={isInteractive && draggableSpin ? endSpinDrag : undefined}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        aspectRatio: "1 / 1",
        cursor: draggableSpin ? "grab" : isInteractive ? "pointer" : undefined,
        touchAction: isInteractive ? "none" : undefined,
        ...style,
      } as any}
      role="img"
      aria-label={ariaLabel}
    >
      {fallback ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: fallbackPalette.fallback ?? PALETTES.cyan.fallback,
            boxShadow: "0 0 42px rgba(56,244,255,0.38), inset 0 0 38px rgba(255,255,255,0.18)",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "18%",
              borderRadius: "50%",
              border: "1px solid rgba(165,255,255,0.56)",
              boxShadow: "0 0 18px rgba(56,244,255,0.38)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "34%",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.62)",
              background: "rgba(220,255,255,0.28)",
            }}
          />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      )}
    </div>
  );
}
