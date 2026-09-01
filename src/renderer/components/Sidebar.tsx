import { useAuth } from '../hooks/useAuth';

export type AppView = 'dashboard' | 'insights';

const NAV_ITEMS: Array<{ label: string; view: AppView }> = [
  { label: 'Dashboard', view: 'dashboard' },
  { label: 'Tasks', view: 'dashboard' },
  { label: 'History', view: 'dashboard' },
  { label: 'Insights', view: 'insights' },
  { label: 'Settings', view: 'dashboard' },
];

type SidebarProps = {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
};

export function Sidebar({ activeView, onNavigate }: SidebarProps): JSX.Element {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <h1 className="sidebar-title">A.S.U.N.A.</h1>
      <ul className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              className={
                item.view === activeView && item.label === 'Insights'
                  ? 'nav-item nav-item--selected nav-item--button'
                  : item.view === 'dashboard' && activeView === 'dashboard' && item.label === 'Dashboard'
                    ? 'nav-item nav-item--selected nav-item--button'
                    : 'nav-item nav-item--button'
              }
              onClick={() => onNavigate(item.view)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        className="sidebar-sign-out"
        type="button"
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    </nav>
  );
}
