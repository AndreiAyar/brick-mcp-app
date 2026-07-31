import { useEffect, useState, type ReactNode } from 'react';

interface CollapsibleSidebarProps {
  children: ReactNode;
  label: string;
  storageKey: string;
  side?: 'left' | 'right';
}

export default function CollapsibleSidebar({
  children,
  label,
  storageKey,
  side = 'left',
}: CollapsibleSidebarProps) {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) !== 'closed';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, isOpen ? 'open' : 'closed');
    } catch {
      // Storage can be unavailable in privacy-restricted iframe hosts.
    }
  }, [isOpen, storageKey]);

  const isLeft = side === 'left';

  return (
    <aside
      aria-label={label}
      style={{
        position: 'absolute',
        [side]: 8,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: isLeft ? 'row' : 'row-reverse',
        alignItems: 'center',
        gap: 4,
        zIndex: 10,
      }}
    >
      {isOpen && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 8,
          padding: 4,
        }}>
          {children}
        </div>
      )}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Hide' : 'Show'} ${label}`}
        title={`${isOpen ? 'Hide' : 'Show'} ${label}`}
        onClick={() => setIsOpen((open) => !open)}
        style={{
          width: 26,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 6,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        {isOpen === isLeft ? '‹' : '›'}
      </button>
    </aside>
  );
}
