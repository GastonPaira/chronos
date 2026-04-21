import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface UserMenuProps {
  name: string;
  fullName: string;
  email: string;
  onSignOut: () => void;
}

export default function UserMenu({ name, fullName, email, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownSide, setDropdownSide] = useState<'left' | 'right'>('right');
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownSide(rect.left < 160 ? 'left' : 'right');
    }
    setIsOpen((v) => !v);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Pill button */}
      <button
        onClick={handleToggle}
        className={`flex items-center gap-1.5 border rounded-full py-1 pl-1 pr-2.5 cursor-pointer transition-colors ${
          isOpen
            ? 'bg-[#f5a623]/6 border-[#f5a623]/30'
            : 'bg-white/4 border-white/10 hover:bg-white/8'
        }`}
      >
        {/* Avatar circle */}
        <span className="w-6 h-6 rounded-full bg-[#f5a623]/15 border border-[#f5a623]/25 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="4" r="2" />
            <path d="M2 11a4 4 0 018 0" />
          </svg>
        </span>
        {/* First name */}
        <span className="text-[11px] font-medium text-[#d1d5db]">{name}</span>
        {/* Chevron */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke={isOpen ? '#f5a623' : '#6b7280'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="2,3.5 5,6.5 8,3.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute top-full mt-2 w-52 bg-[#16161f] border border-[#1e1e2e] rounded-xl overflow-hidden z-[100] ${dropdownSide === 'left' ? 'left-0' : 'right-0'}`}>
          {/* Profile info */}
          <div className="px-4 py-3 border-b border-[#1e1e2e]">
            <p className="text-[13px] font-semibold text-[#e5e7eb]">{fullName}</p>
            <p className="text-[11px] text-[#6b7280] mt-0.5">{email}</p>
          </div>

          {/* Stats */}
          <div
            onClick={() => { router.push('/stats'); setIsOpen(false); }}
            className="flex items-center gap-2.5 px-4 py-3 text-[12px] text-[#9ca3af] hover:bg-white/3 cursor-pointer transition-colors"
          >
            <span className="w-7 h-7 rounded-[7px] bg-white/4 border border-white/7 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="7" width="2" height="4" rx="0.5" />
                <rect x="5" y="4" width="2" height="7" rx="0.5" />
                <rect x="9" y="1" width="2" height="10" rx="0.5" />
              </svg>
            </span>
            Mis estadísticas
          </div>

          {/* Sign out */}
          <div
            onClick={() => { onSignOut(); setIsOpen(false); }}
            className="flex items-center gap-2.5 px-4 py-3 text-[12px] text-[#f87171] border-t border-[#1e1e2e] hover:bg-red-500/5 cursor-pointer transition-colors"
          >
            <span className="w-7 h-7 rounded-[7px] bg-red-500/8 border border-red-500/15 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </span>
            Cerrar sesión
          </div>
        </div>
      )}
    </div>
  );
}
