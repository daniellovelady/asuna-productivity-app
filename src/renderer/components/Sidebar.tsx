import { useAuth } from '../hooks/useAuth';
import {
  NAV_ITEMS,
  isNavItemSelected,
  type AppView,
} from '../navigation/appNavigation';

export type { AppView } from '../navigation/appNavigation';

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
                isNavItemSelected(activeView, item)
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
