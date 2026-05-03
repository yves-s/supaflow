import type { SVGProps } from 'react'

/**
 * Icon name set that matches the design source (project/components/*.jsx and
 * project/app.jsx). New icons are added here, not redefined inline in views.
 */
export type IconName =
  | 'home'
  | 'flow'
  | 'alert'
  | 'list'
  | 'cog'
  | 'search'
  | 'bell'
  | 'play'
  | 'check'
  | 'x'
  | 'chev-r'
  | 'chev-d'
  | 'filter'
  | 'refresh'
  | 'spark'
  | 'code'
  | 'clock'
  | 'pulse'
  | 'users'
  | 'db'
  | 'git'
  | 'plus'
  | 'more'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** Pixel size for both width and height. Defaults to 14, matching the design. */
  size?: number
}

/**
 * Inline-SVG icon set. All icons share a 16x16 viewBox, 1.5px stroke,
 * round caps/joins and `currentColor` so they inherit text colour.
 *
 * Use:
 *   <Icon name="bell" />
 *   <Icon name="alert" size={18} className="…" />
 *
 * Adding an icon: append to the IconName union and add a case below.
 */
export default function Icon({ name, size = 14, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
    >
      {renderIcon(name)}
    </svg>
  )
}

function renderIcon(name: IconName): JSX.Element {
  switch (name) {
    case 'home':
      return (
        <>
          <path d="M2 7l6-4.5L14 7v6.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7Z" />
          <path d="M6.5 14.5v-4h3v4" />
        </>
      )
    case 'flow':
      return (
        <>
          <rect x="2" y="3" width="4" height="3" rx="1" />
          <rect x="10" y="3" width="4" height="3" rx="1" />
          <rect x="6" y="10" width="4" height="3" rx="1" />
          <path d="M4 6v1.5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6" />
          <path d="M8 8.5V10" />
        </>
      )
    case 'alert':
      return (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v4" />
          <circle cx="8" cy="11" r="0.5" fill="currentColor" />
        </>
      )
    case 'list':
      return (
        <>
          <path d="M3 2.5h10v11H3z" />
          <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
        </>
      )
    case 'cog':
      return (
        <>
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1.5v1.7M8 12.8v1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M1.5 8h1.7M12.8 8h1.7M3.4 12.6l1.2-1.2M11.4 4.6l1.2-1.2" />
        </>
      )
    case 'search':
      return (
        <>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L13 13" />
        </>
      )
    case 'bell':
      return (
        <>
          <path d="M4 7a4 4 0 1 1 8 0v3l1.2 2H2.8L4 10V7Z" />
          <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" />
        </>
      )
    case 'play':
      return <path d="M5 3.5v9l7-4.5-7-4.5Z" />
    case 'check':
      return <path d="M3 8.5l3.5 3.5L13 5.5" />
    case 'x':
      return <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    case 'chev-r':
      return <path d="M6 3l4 5-4 5" />
    case 'chev-d':
      return <path d="M3 6l5 4 5-4" />
    case 'filter':
      return <path d="M2.5 3.5h11l-4 5v4l-3 1.5v-5.5l-4-5Z" />
    case 'refresh':
      return (
        <>
          <path d="M2.5 8a5.5 5.5 0 0 1 9.7-3.5L13.5 6" />
          <path d="M13.5 2.5V6h-3.5" />
          <path d="M13.5 8a5.5 5.5 0 0 1-9.7 3.5L2.5 10" />
          <path d="M2.5 13.5V10h3.5" />
        </>
      )
    case 'spark':
      return (
        <>
          <path d="M2 11.5l3-3 2.5 2 4-4.5 2.5 2.5" />
          <path d="M2 13.5h12" />
        </>
      )
    case 'code':
      return (
        <>
          <path d="M5.5 4.5L2 8l3.5 3.5" />
          <path d="M10.5 4.5L14 8l-3.5 3.5" />
          <path d="M9.5 3l-3 10" />
        </>
      )
    case 'clock':
      return (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4.5V8l2.5 1.5" />
        </>
      )
    case 'pulse':
      return <path d="M1.5 8h3l1.5-3.5L9 12l1.5-4H14.5" />
    case 'users':
      return (
        <>
          <circle cx="6" cy="6" r="2.25" />
          <path d="M2 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4" />
          <path d="M11 4.5a2 2 0 0 1 0 4" />
          <path d="M14 13.5c0-1.8-1.2-3.3-2.8-3.8" />
        </>
      )
    case 'db':
      return (
        <>
          <ellipse cx="8" cy="3.5" rx="5" ry="1.8" />
          <path d="M3 3.5v9c0 1 2.2 1.8 5 1.8s5-.8 5-1.8v-9" />
          <path d="M3 8c0 1 2.2 1.8 5 1.8s5-.8 5-1.8" />
        </>
      )
    case 'git':
      return (
        <>
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="4" cy="12" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
          <path d="M4 5.5v5" />
          <path d="M4 8h5a1.5 1.5 0 0 1 1.5 1.5" />
          <path d="M10.5 8a1.5 1.5 0 0 1-1.5-1.5V5" />
        </>
      )
    case 'plus':
      return <path d="M8 3v10M3 8h10" />
    case 'more':
      return (
        <>
          <circle cx="3.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="12.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
        </>
      )
  }
}
