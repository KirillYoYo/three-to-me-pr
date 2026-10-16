import { NavLink, Outlet } from 'react-router';
import { Suspense } from 'react';

import { groups } from '../catalog';

export function Shell() {
  return (
    <div className="shell">
      <nav className="nav">
        <p className="brand">
          drei
          <span>наглядные примеры</span>
        </p>
        {groups.map((group) => (
          <div key={group.title} className="nav-group">
            <p className="nav-label">{group.title}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                <span>{item.title}</span>
                <small>{item.eyebrow}</small>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <Suspense fallback={<div className="workspace loading">Загрузка примера…</div>}>
        <Outlet />
      </Suspense>
    </div>
  );
}
