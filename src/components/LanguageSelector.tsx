import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
] as const;

export default function LanguageSelector() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const current = i18n.language;

  const switchLanguage = (locale: string) => {
    router.push(router.pathname, router.asPath, { locale, scroll: false });
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-chronos-border bg-chronos-surface px-1 py-1">
      {LANGUAGES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => switchLanguage(code)}
          title={label}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
            current === code
              ? 'bg-chronos-gold text-chronos-bg shadow-sm'
              : 'text-chronos-muted hover:text-chronos-text'
          }`}
        >
          <span>{flag}</span>
          <span>{code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
