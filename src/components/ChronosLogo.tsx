interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 28, title: 'text-xl', subtitle: 'text-xs' },
  md: { icon: 44, title: 'text-3xl', subtitle: 'text-sm' },
  lg: { icon: 72, title: 'text-5xl', subtitle: 'text-base' },
};

export default function ChronosLogo({ size = 'md' }: Props) {
  const s = sizes[size];
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Hourglass icon */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]"
      >
        <polygon
          points="6,4 42,4 24,24 42,44 6,44 24,24"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <polygon points="10,8 38,8 24,22" fill="#f59e0b" opacity="0.85" />
        <polygon points="18,27 30,27 24,34" fill="#f59e0b" opacity="0.55" />
        <polygon points="10,40 38,40 30,32 18,32" fill="#f59e0b" opacity="0.85" />
        <circle cx="24" cy="24" r="2" fill="#f59e0b" />
      </svg>

      {/* Title */}
      <div className="text-center leading-none">
        <h1
          className={`${s.title} font-bold tracking-[0.2em] text-chronos-gold uppercase`}
          style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.25em' }}
        >
          CHRONOS
        </h1>
      </div>
    </div>
  );
}
