const NAV_ITEMS = [
  { label: 'Dashboard', selected: true },
  { label: 'Tasks', selected: false },
  { label: 'History', selected: false },
  { label: 'Insights', selected: false },
  { label: 'Settings', selected: false },
] as const;

export function Sidebar(): JSX.Element {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <h1 className="sidebar-title">A.S.U.N.A.</h1>
      <ul className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <li key={item.label}>
            <span
              className={
                item.selected ? 'nav-item nav-item--selected' : 'nav-item'
              }
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
