import { useState } from "react";
import {
  JarvisOrb,
  type JarvisPaletteValues,
  type JarvisStateName,
  type JarvisStateTarget,
} from "jarvis-ai-web-animation";

const violetPalette: JarvisPaletteValues = {
  core: 0xf5e8ff,
  primary: 0xa855f7,
  secondary: 0x7c3aed,
  tertiary: 0xc084fc,
  deep: 0x2e1065,
  fallback:
    "radial-gradient(circle at 50% 50%, #f5e8ff 0%, #a855f7 30%, #2e1065 75%, transparent)",
};

const customListening: JarvisStateTarget = {
  energy: 1.4,
  rotationSpeed: 0.6,
  particleSpeed: 1.6,
  shellRadius: 1.08,
  ringSpread: 1.0,
  filamentOpacity: 0.7,
  coreScale: 1.1,
  bloom: 0.9,
};

const builtInStates: JarvisStateName[] = ["idle", "thinking", "success", "alert"];

const cell: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  padding: 16,
  background: "rgba(255,255,255,0.04)",
  borderRadius: 16,
};

const orbBox: React.CSSProperties = { width: 220, height: 220 };

export function App() {
  const [state, setState] = useState<JarvisStateName>("thinking");
  const [pulses, setPulses] = useState(0);

  if (typeof window !== "undefined" && window.location.search.includes("hero=1")) {
    return (
      <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 560, height: 560 }}>
          <JarvisOrb size="hero" palette="cyan" state="thinking" interactive draggableSpin />
        </div>
      </div>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1>jarvis-ai-web-animation — basic example</h1>
        <p style={{ opacity: 0.7, fontSize: 14 }}>
          Built-in palettes, built-in states, custom palette, custom state, and pointer-pulse callback.
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
        <div style={cell}>
          <h2>cyan / idle</h2>
          <div style={orbBox}><JarvisOrb palette="cyan" state="idle" /></div>
        </div>
        <div style={cell}>
          <h2>aurora / thinking</h2>
          <div style={orbBox}><JarvisOrb palette="aurora" state="thinking" /></div>
        </div>
        <div style={cell}>
          <h2>ember / success</h2>
          <div style={orbBox}><JarvisOrb palette="ember" state="success" /></div>
        </div>
        <div style={cell}>
          <h2>cyan / alert</h2>
          <div style={orbBox}><JarvisOrb palette="cyan" state="alert" /></div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
        <div style={cell}>
          <h2>custom violet palette</h2>
          <div style={orbBox}><JarvisOrb palette={violetPalette} state="thinking" /></div>
        </div>
        <div style={cell}>
          <h2>custom 'listening' state</h2>
          <div style={orbBox}><JarvisOrb state={customListening} palette="cyan" /></div>
        </div>
        <div style={cell}>
          <h2>interactive (click me)</h2>
          <div style={orbBox}>
            <JarvisOrb
              palette="cyan"
              state={state}
              interactive
              onPointerPulse={() => setPulses((n) => n + 1)}
            />
          </div>
          <small style={{ opacity: 0.7 }}>pointer pulses: {pulses}</small>
        </div>
        <div style={cell}>
          <h2>state controls</h2>
          <div style={orbBox}><JarvisOrb palette="cyan" state={state} /></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {builtInStates.map((s) => (
              <button
                key={s}
                onClick={() => setState(s)}
                style={{
                  padding: "6px 12px",
                  background: s === state ? "rgba(56,244,255,0.25)" : "rgba(255,255,255,0.06)",
                  color: "#e6f7ff",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ textAlign: "left" }}>sizes</h2>
        <div style={{ display: "flex", gap: 24, alignItems: "center", padding: 16, background: "rgba(255,255,255,0.04)", borderRadius: 16 }}>
          <div style={{ width: 96, height: 96 }}><JarvisOrb size="avatar" palette="cyan" state="idle" /></div>
          <div style={{ width: 220, height: 220 }}><JarvisOrb size="panel" palette="cyan" state="idle" /></div>
          <div style={{ width: 360, height: 360 }}><JarvisOrb size="hero" palette="cyan" state="idle" interactive draggableSpin /></div>
        </div>
      </section>
    </main>
  );
}
