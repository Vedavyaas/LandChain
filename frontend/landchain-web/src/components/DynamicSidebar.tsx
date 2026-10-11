import React, { useState } from 'react';
import type { User, Role } from '../types';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  user: User;
  onLogout: () => void;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const getRoleIcon = (role: Role): string => {
  switch (role) {
    case 'OWNER': return '🏠';
    case 'BUYER': return '🤝';
    case 'REGISTRAR': return '📋';
    case 'GOVERNMENT': return '🏛';
    case 'BANK': return '🏦';
    case 'AUDITOR': return '🔍';
    case 'ADMIN': return '🛡';
    default: return '📦';
  }
};

const DynamicSidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onLogout,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const navItems: NavItem[] = [
    { id: 'desk', label: 'Desk', icon: getRoleIcon(user.role) },
  ];
  if (user.role === 'ADMIN') {
    navItems.push(
      { id: 'members', label: 'Members', icon: '👥' },
      { id: 'logs', label: 'Logs', icon: '📜' }
    );
  }
  navItems.push(
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'privileges', label: 'Privileges', icon: '🔑' }
  );

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    setIsHovered(false);
  };

  return (
    <>
      {isHovered && (
        <div
          className="lc-sidebar-backdrop"
          onClick={() => setIsHovered(false)}
        />
      )}

      <aside
        className={`lc-dynamic-sidebar ${isHovered ? 'lc-dynamic-sidebar--expanded' : 'lc-dynamic-sidebar--collapsed'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Sidebar Navigation"
      >
        {/* Brand header */}
        <div className="lc-sidebar-header">
          <div className="lc-sidebar-logo">
            <span className="lc-sidebar-logo__icon">⛓</span>
            {isHovered && (
              <span className="lc-sidebar-logo__brand">LandChain</span>
            )}
          </div>
        </div>

        {/* Navigation items with dynamically swapping ACTIVE badge */}
        <nav className="lc-sidebar-nav">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`lc-sidebar-item ${isActive ? 'lc-sidebar-item--active' : ''}`}
                onClick={() => handleItemClick(item.id)}
                title={!isHovered ? item.label : undefined}
              >
                <span className="lc-sidebar-item__icon">{item.icon}</span>
                {isHovered && (
                  <div className="lc-sidebar-item__content">
                    <span className="lc-sidebar-item__label">{item.label}</span>
                    {isActive && (
                      <span className="lc-sidebar-item__badge">ACTIVE</span>
                    )}
                  </div>
                )}
                {isActive && <span className="lc-sidebar-item__indicator" />}
              </button>
            );
          })}
        </nav>

        {/* Sole Logout Button located in the Sidebar */}
        <div className="lc-sidebar-footer">
          {isHovered ? (
            <button
              type="button"
              className="lc-sidebar-logout-btn"
              onClick={onLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.8rem',
              }}
            >
              <span>🚪</span>
              <span>Sign out</span>
            </button>
          ) : (
            <button
              type="button"
              className="lc-sidebar-mini-logout"
              onClick={onLogout}
              title="Sign out"
            >
              🚪
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default DynamicSidebar;
