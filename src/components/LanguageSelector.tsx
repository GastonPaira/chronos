import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useRef, useState, useEffect } from 'react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
] as const;

export default function LanguageSelector() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const current = i18n.language;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const switchLanguage = (locale: string) => {
    router.push(router.asPath, router.asPath, { locale });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        aria-label="Select language"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="9" r="7.5" />
          <ellipse cx="9" cy="9" rx="3" ry="7.5" />
          <line x1="1.5" y1="6.5" x2="16.5" y2="6.5" />
          <line x1="1.5" y1="11.5" x2="16.5" y2="11.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-[#16161f] border border-[#1e1e2e] rounded-xl overflow-hidden shadow-lg z-50 min-w-[140px]">
          {LANGUAGES.map(({ code, label, flag }) => (
            <div
              key={code}
              onClick={() => switchLanguage(code)}
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span>{flag}</span>
              <span className={current === code ? 'text-[#f5a623]' : 'text-[#9ca3af]'}>{label}</span>
              {current === code && (
                <svg className="ml-auto" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
