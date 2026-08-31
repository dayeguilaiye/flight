type IconProps = { className?: string }

export function HomeIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m4 10 8-6 8 6v9H8v-6h8v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

export function MenuIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  )
}

export function CloseIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  )
}

export function PlayIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m8 5 11 7-11 7V5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

export function StopIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <rect height="12" rx="1" stroke="currentColor" strokeWidth="1.5" width="12" x="6" y="6" />
    </svg>
  )
}

export function ChevronIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  )
}

export function PianoIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M3 5h18v14H3V5Zm4 0v8m4-8v8m4-8v8m4-8v8M7 13h4m4 0h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
    </svg>
  )
}
