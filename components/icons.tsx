export function Mark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#0c2340" />
      <circle cx="32" cy="34" r="15" stroke="#d4a054" strokeWidth="4" fill="none" />
      <circle cx="45" cy="16" r="5" fill="#e07a62" />
    </svg>
  );
}

export function SunIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="5" fill="#d4a054" />
      <g stroke="#d4a054" strokeWidth="1.6" strokeLinecap="round">
        <path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2 2M22.5 22.5l2 2M24.5 7.5l-2 2M9.5 22.5l-2 2" />
      </g>
    </svg>
  );
}

export function RhythmIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 24" className={className} aria-hidden="true">
      <path
        d="M2 14c4-8 6-8 10 0s6 8 10 0 6-8 10 0 6 8 10 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MicIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
