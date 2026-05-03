import { useId, useMemo } from 'react'

export interface SparklineProps {
  /** Numeric series. Empty/single-point inputs render an empty SVG. */
  data: number[]
  /** Stroke / gradient colour. Accepts any CSS colour. Defaults to currentColor. */
  color?: string
  /** Total SVG height in px. Defaults to 32. */
  height?: number
  /** Total SVG width in px. Defaults to 96. */
  width?: number
  /** Toggle the gradient area below the line. Defaults to true. */
  fill?: boolean
  /** Optional CSS class for the wrapping <svg>. */
  className?: string
  /** Optional aria-label override. Hidden from a11y tree by default. */
  ariaLabel?: string
}

/**
 * Smooth-path sparkline with optional gradient area.
 *
 * Mirrors the prototype in project/components/primitives.jsx: a Catmull-Rom-
 * style cubic spline for the line plus a closed area path that consumes a
 * vertical linear gradient (color → transparent).
 *
 * Edge cases:
 *   - data.length < 2 → renders the SVG container only (no path), keeping
 *     layout stable for skeleton / loading states.
 *   - All-equal values → renders a flat line at the vertical centre.
 */
export default function Sparkline({
  data,
  color = 'currentColor',
  height = 32,
  width = 96,
  fill = true,
  className,
  ariaLabel,
}: SparklineProps) {
  // useId() gives a stable, SSR-safe id so the gradient stops do not collide
  // when multiple sparklines mount in the same tree.
  const gradientId = useId()

  const { linePath, areaPath, hasPath } = useMemo(
    () => buildPaths(data, width, height),
    [data, width, height],
  )

  const a11yProps = ariaLabel
    ? { role: 'img', 'aria-label': ariaLabel }
    : { 'aria-hidden': true as const }

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      {...a11yProps}
    >
      {fill && hasPath && (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && hasPath && (
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      )}
      {hasPath && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}

/**
 * Build the smooth line path and the closed area path from the data series.
 *
 * Algorithm: Catmull-Rom interpolation through each data point, converted to
 * cubic Bezier segments with the standard tension factor (1/6). This gives
 * the soft-shouldered curve the design source uses without overshoot at the
 * edges.
 */
function buildPaths(
  data: number[],
  width: number,
  height: number,
): { linePath: string; areaPath: string; hasPath: boolean } {
  if (!data || data.length < 2) {
    return { linePath: '', areaPath: '', hasPath: false }
  }

  // Use a small inner padding so the stroke does not get clipped at the edges
  // of the viewBox.
  const padY = 1.5
  const usableH = Math.max(0, height - padY * 2)
  const minV = Math.min(...data)
  const maxV = Math.max(...data)
  const range = maxV - minV || 1

  // Map series into [{x, y}] in SVG coordinates (y grows downward).
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: padY + usableH - ((v - minV) / range) * usableH,
  }))

  // Catmull-Rom → cubic Bezier conversion.
  let line = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    line += ` C ${fmt(c1x)} ${fmt(c1y)}, ${fmt(c2x)} ${fmt(c2y)}, ${fmt(p2.x)} ${fmt(p2.y)}`
  }

  // Area path = line path + a baseline rectangle, ready for gradient fill.
  const last = points[points.length - 1]
  const first = points[0]
  const area = `${line} L ${fmt(last.x)} ${fmt(height)} L ${fmt(first.x)} ${fmt(height)} Z`

  return { linePath: line, areaPath: area, hasPath: true }
}

/** Round to 2 decimals to keep the SVG output compact and deterministic. */
function fmt(n: number): string {
  return Math.round(n * 100) / 100 + ''
}
