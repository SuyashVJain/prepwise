// Small inline icons for the sidebar: 20px, 1.5px stroke, drawn in the current text colour.
import type { ReactNode } from 'react'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export const DashboardIcon = () => (
  <Icon><rect x="3" y="3" width="5.5" height="5.5" rx="1.2" /><rect x="11.5" y="3" width="5.5" height="5.5" rx="1.2" /><rect x="3" y="11.5" width="5.5" height="5.5" rx="1.2" /><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.2" /></Icon>
)

export const NewSessionIcon = () => (
  <Icon><circle cx="10" cy="10" r="7" /><path d="M10 6.5v7M6.5 10h7" /></Icon>
)

export const StudyIcon = () => (
  <Icon><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H16v12H5.5A1.5 1.5 0 0 0 4 16.5v-12Z" /><path d="M4 16.5A1.5 1.5 0 0 0 5.5 18H16v-3" /></Icon>
)

export const TutorIcon = () => (
  <Icon><rect x="7.5" y="2.5" width="5" height="9" rx="2.5" /><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" /></Icon>
)

export const HistoryIcon = () => (
  <Icon><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></Icon>
)

export const ProgressIcon = () => (
  <Icon><path d="M3.5 16.5h13" /><path d="M5 13l3.2-3.6 2.8 2.1 4-5" /></Icon>
)

export const SettingsIcon = () => (
  <Icon><path d="M3.5 6h13M3.5 14h13" /><circle cx="7.5" cy="6" r="1.8" fill="var(--bg)" /><circle cx="12.5" cy="14" r="1.8" fill="var(--bg)" /></Icon>
)

export const LogoutIcon = () => (
  <Icon><path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /><path d="M12 7l3 3-3 3M15 10H8" /></Icon>
)
