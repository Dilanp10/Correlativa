import { NavLink } from 'react-router-dom'
import { ROUTES } from '@/shared/constants'

const navItems = [
  {
    to: ROUTES.DASHBOARD,
    label: 'Inicio',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: ROUTES.TREE,
    label: 'Árbol',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <line x1="12" y1="7" x2="12" y2="13" />
        <line x1="12" y1="13" x2="5" y2="17" />
        <line x1="12" y1="13" x2="19" y2="17" />
      </svg>
    ),
  },
  {
    to: ROUTES.AGENDA,
    label: 'Agenda',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: ROUTES.STUDY,
    label: 'Estudiar',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44A2.5 2.5 0 0 1 2.5 16.5v-10A2.5 2.5 0 0 1 5 4h1.5" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44A2.5 2.5 0 0 0 21.5 16.5v-10A2.5 2.5 0 0 0 19 4h-1.5" />
      </svg>
    ),
  },
  {
    to: ROUTES.PROFILE,
    label: 'Perfil',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

/** Sidebar de navegación — solo visible en desktop (md+). */
export default function SideNav() {
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col bg-bg-surface border-r border-muted/40 z-30">
      {/* Logo / título */}
      <div className="px-6 py-6 border-b border-muted/30">
        <p className="text-lg font-bold text-text-primary tracking-tight">Correlativa</p>
        <p className="text-xs text-text-secondary mt-0.5">Sistema universitario</p>
      </div>

      {/* Links */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.icon(isActive)}
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer decorativo */}
      <div className="px-6 py-4 border-t border-muted/30">
        <p className="text-xs text-text-secondary/50">v1.0 · free tier</p>
      </div>
    </aside>
  )
}
