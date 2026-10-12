"use client";

/**
 * File: components/layout/InputTextColorPicker.tsx
 * Pick a text color → auto-adjust page backgrounds for readable contrast.
 */

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "ems-readable-theme";
const LEGACY_UI = "ems-ui-text-color";
const LEGACY_INPUT = "ems-input-text-color";

type ThemePack = {
  text: string;
  background: string;
  card: string;
  shell: string;
  muted: string;
  border: string;
  borderStrong: string;
  inputBg: string;
};

/** Relative luminance 0–1 (sRGB). */
function luminance(hex: string): number {
  const n = hex.replace("#", "");
  if (n.length !== 6) return 0.5;
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(n.slice(0, 2), 16));
  const g = toLin(parseInt(n.slice(2, 4), 16));
  const b = toLin(parseInt(n.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const L1 = luminance(a);
  const L2 = luminance(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

/** Mix hex toward black (t=0) or white (t=1) amount 0–1. */
function mix(hex: string, towardWhite: boolean, amount: number): string {
  const n = hex.replace("#", "");
  if (n.length !== 6) return hex;
  const mixCh = (c: number) => {
    const target = towardWhite ? 255 : 0;
    return Math.round(c + (target - c) * amount);
  };
  const r = mixCh(parseInt(n.slice(0, 2), 16));
  const g = mixCh(parseInt(n.slice(2, 4), 16));
  const b = mixCh(parseInt(n.slice(4, 6), 16));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Build a full surface palette so `text` stays readable (≥ ~4.5:1 on card/bg).
 */
function buildTheme(text: string): ThemePack {
  const L = luminance(text);
  const textIsLight = L > 0.45;

  // Opposite surfaces: light text → dark surfaces, dark text → light surfaces
  let background: string;
  let card: string;
  let shell: string;
  let muted: string;
  let border: string;
  let borderStrong: string;
  let inputBg: string;

  if (textIsLight) {
    // Dark theme surfaces
    background = "#0a0c0b";
    card = "#1a1e1c";
    shell = "#121514";
    inputBg = "#0f1210";
    muted = mix(text, false, 0.35);
    border = "rgba(255,255,255,0.08)";
    borderStrong = "rgba(255,255,255,0.14)";
  } else {
    // Light theme surfaces
    background = "#e8ebe7";
    card = "#ffffff";
    shell = "#f4f6f3";
    inputBg = "#ffffff";
    muted = mix(text, true, 0.45);
    border = "rgba(18,21,20,0.08)";
    borderStrong = "rgba(18,21,20,0.14)";
  }

  // Ensure card vs text contrast is strong; darken/lighten card if needed
  let guard = 0;
  while (contrastRatio(text, card) < 4.5 && guard < 8) {
    card = mix(card, !textIsLight, 0.12);
    guard++;
  }
  guard = 0;
  while (contrastRatio(text, background) < 4.5 && guard < 8) {
    background = mix(background, !textIsLight, 0.1);
    guard++;
  }
  guard = 0;
  while (contrastRatio(text, inputBg) < 4.5 && guard < 8) {
    inputBg = mix(inputBg, !textIsLight, 0.1);
    guard++;
  }

  // Muted should still be readable but softer
  if (contrastRatio(muted, card) < 3) {
    muted = mix(text, textIsLight, 0.25);
  }

  return {
    text,
    background,
    card,
    shell,
    muted,
    border,
    borderStrong,
    inputBg,
  };
}

const VARS: Array<[keyof ThemePack | "uiText" | "inputText" | "foreground", string]> = [
  ["text", "--foreground"],
  ["text", "--ui-text"],
  ["text", "--input-text"],
  ["background", "--background"],
  ["card", "--card"],
  ["shell", "--shell"],
  ["muted", "--muted"],
  ["border", "--border"],
  ["borderStrong", "--border-strong"],
  ["inputBg", "--input-bg"],
];

function applyTheme(pack: ThemePack) {
  const root = document.documentElement;
  const style = root.style;
  style.setProperty("--foreground", pack.text);
  style.setProperty("--ui-text", pack.text);
  style.setProperty("--input-text", pack.text);
  style.setProperty("--background", pack.background);
  style.setProperty("--card", pack.card);
  style.setProperty("--shell", pack.shell);
  style.setProperty("--muted", pack.muted);
  style.setProperty("--border", pack.border);
  style.setProperty("--border-strong", pack.borderStrong);
  style.setProperty("--input-bg", pack.inputBg);

  // Keep .dark class in sync with luminance so Tailwind dark: variants match
  const dark = luminance(pack.text) > 0.45;
  root.classList.toggle("dark", dark);
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    /* ignore */
  }
}

function clearThemeOverrides() {
  const style = document.documentElement.style;
  [
    "--foreground",
    "--ui-text",
    "--input-text",
    "--background",
    "--card",
    "--shell",
    "--muted",
    "--border",
    "--border-strong",
    "--input-bg",
  ].forEach((k) => style.removeProperty(k));
}

const PRESETS = [
  { label: "Forest dark", text: "#eef1ee" },
  { label: "Ink light", text: "#121514" },
  { label: "Green", text: "#3dce7a" },
  { label: "Amber", text: "#f0b90b" },
  { label: "Sky", text: "#7dd3fc" },
  { label: "Rose", text: "#fda4af" },
  { label: "White", text: "#ffffff" },
  { label: "Black", text: "#000000" },
];

export default function InputTextColorPicker() {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState("#eef1ee");
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<ThemePack | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const pack = JSON.parse(raw) as ThemePack;
        setColor(pack.text);
        setPreview(pack);
        applyTheme(pack);
        return;
      }
      const legacy =
        localStorage.getItem(LEGACY_UI) || localStorage.getItem(LEGACY_INPUT);
      if (legacy && /^#[0-9A-Fa-f]{6}$/.test(legacy)) {
        const pack = buildTheme(legacy);
        setColor(legacy);
        setPreview(pack);
        applyTheme(pack);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function commit(hex: string) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    const pack = buildTheme(hex);
    setColor(hex);
    setPreview(pack);
    applyTheme(pack);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
      localStorage.removeItem(LEGACY_UI);
      localStorage.removeItem(LEGACY_INPUT);
    } catch {
      /* ignore */
    }
  }

  function reset() {
    clearThemeOverrides();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_UI);
      localStorage.removeItem(LEGACY_INPUT);
    } catch {
      /* ignore */
    }
    const dark = document.documentElement.classList.contains("dark");
    const next = dark ? "#eef1ee" : "#121514";
    setColor(next);
    setPreview(null);
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-2.5 text-[12px] font-semibold text-[var(--foreground)]"
        aria-label="Readable theme"
      >
        <span className="size-3.5 rounded-full bg-[var(--muted)]" />
        <span className="hidden sm:inline">Aa</span>
      </button>
    );
  }

  const pack = preview || buildTheme(color);
  const ratio = contrastRatio(pack.text, pack.card).toFixed(1);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Readable text & background theme"
        title="Text color → auto backgrounds"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-2.5 text-[12px] font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--shell)]"
      >
        <span
          className="size-3.5 rounded-full border border-black/20 shadow-sm"
          style={{ backgroundColor: color }}
        />
        <span className="hidden sm:inline">Aa</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-[100] mt-2 w-[20rem] rounded-xl border border-[var(--border)] p-3 shadow-lg"
          style={{
            background: pack.card,
            color: pack.text,
            borderColor: pack.borderStrong,
          }}
        >
          <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide opacity-80">
            Readable theme
          </p>
          <p className="mb-3 text-[11px] leading-snug opacity-70">
            Pick a text color. Backgrounds and cards adjust automatically so
            text stays readable.
          </p>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#eef1ee"}
              onChange={(e) => commit(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border p-0.5"
              style={{ borderColor: pack.borderStrong, background: "transparent" }}
              aria-label="Pick text color"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => {
                const v = e.target.value.trim();
                setColor(v);
                if (/^#[0-9A-Fa-f]{6}$/.test(v)) commit(v);
              }}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border px-2.5 py-2 font-mono text-[13px]"
              style={{
                background: pack.inputBg,
                color: pack.text,
                borderColor: pack.borderStrong,
              }}
              placeholder="#eef1ee"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.text}
                type="button"
                title={p.label}
                onClick={() => commit(p.text)}
                className="size-7 rounded-full border shadow-sm transition hover:scale-110"
                style={{
                  backgroundColor: p.text,
                  borderColor: pack.borderStrong,
                }}
              />
            ))}
          </div>

          {/* Live preview card */}
          <div
            className="mt-3 space-y-2 rounded-lg border p-3"
            style={{
              background: pack.background,
              borderColor: pack.borderStrong,
            }}
          >
            <div
              className="rounded-lg border p-3"
              style={{
                background: pack.card,
                borderColor: pack.borderStrong,
                color: pack.text,
              }}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: pack.muted }}>
                Sample label
              </p>
              <p className="mt-1 text-[14px] font-semibold">Page title sample</p>
              <input
                type="text"
                readOnly
                value="Text box sample"
                className="mt-2 w-full rounded-md border px-2.5 py-1.5 text-[13px]"
                style={{
                  background: pack.inputBg,
                  color: pack.text,
                  borderColor: pack.borderStrong,
                }}
              />
              <p className="mt-2 text-[11px] opacity-80">
                Contrast on card: <strong>{ratio}:1</strong>
                {Number(ratio) >= 4.5 ? " · WCAG AA" : " · adjusting…"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-3 w-full rounded-lg px-2 py-1.5 text-[12px] font-medium opacity-80 transition hover:opacity-100"
            style={{ color: pack.muted }}
          >
            Reset to default theme
          </button>
        </div>
      )}
    </div>
  );
}
