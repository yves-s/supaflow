/**
 * Shared formatting helpers.
 *
 * Single source of truth for the four primitives the views consume:
 *   fmt(n)      — compact integer with thousands separator and k/M scaling
 *   fmtPct(n)   — percentage with one decimal under 10, integer otherwise
 *   fmtMs(n)    — duration-aware ms / s / m formatter
 *   timeAgo(t)  — relative time in s/m/h/d, accepts Date | string | number
 *
 * These mirror the prototypes in project/components/primitives.jsx so every
 * view (Overview, Workflows, Run detail, Issues) renders the same shape.
 */

/**
 * Format an integer as a compact, human-readable count.
 * Thresholds: < 1_000 → "n", 1_000–999_999 → "1.5k", ≥ 1_000_000 → "1.2M".
 *
 *   fmt(0)        → '0'
 *   fmt(42)       → '42'
 *   fmt(1500)     → '1.5k'
 *   fmt(1_000_000) → '1.0M'
 *
 * Negative values keep their sign (`fmt(-2300) → '-2.3k'`).
 */
export function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs < 1_000) return `${sign}${Math.round(abs)}`;
  if (abs < 1_000_000) {
    const v = abs / 1_000;
    // One decimal, but drop the trailing .0 when whole.
    const rounded = Math.round(v * 10) / 10;
    return `${sign}${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}k`;
  }
  const v = abs / 1_000_000;
  const rounded = Math.round(v * 10) / 10;
  return `${sign}${rounded.toFixed(1)}M`;
}

/**
 * Format a percentage value (already scaled 0–100).
 *   fmtPct(99.4) → '99.4%'
 *   fmtPct(82)   → '82%'
 *   fmtPct(7.3)  → '7.3%'
 */
export function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  // One decimal when below 10, integer otherwise — matches the design's
  // visual rhythm where high success rates are tight numbers and low rates
  // get a fractional digit for resolution.
  if (Math.abs(n) < 10) return `${(Math.round(n * 10) / 10).toFixed(1)}%`;
  return `${Math.round(n)}%`;
}

/**
 * Format a duration in milliseconds.
 *   fmtMs(0)     → '0 ms'
 *   fmtMs(950)   → '950 ms'
 *   fmtMs(1500)  → '1.50 s'
 *   fmtMs(60_000) → '1.0 m'
 */
export function fmtMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return '—';
  if (ms < 1_000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(2)} s`;
  return `${(ms / 60_000).toFixed(1)} m`;
}

/**
 * Relative time in compact units. Accepts a Date, ISO string, or epoch ms.
 *   < 60 s        → '12s ago'
 *   < 60 min      → '5m ago'
 *   < 24 h        → '3h ago'
 *   else          → '4d ago'
 *   future / null → 'just now'
 */
export function timeAgo(input: Date | string | number | null | undefined): string {
  if (input == null) return 'just now';
  let t: number;
  if (input instanceof Date) {
    t = input.getTime();
  } else if (typeof input === 'string') {
    t = Date.parse(input);
    if (Number.isNaN(t)) return 'just now';
  } else {
    t = input;
  }
  const diffMs = Date.now() - t;
  if (diffMs < 0 || Number.isNaN(diffMs)) return 'just now';
  const s = Math.floor(diffMs / 1_000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
