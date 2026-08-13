const AppLogoIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Cuadro base */}
    <rect x="14" y="14" width="72" height="72" rx="16" />
    {/* O central */}
    <circle cx="50" cy="50" r="18" />
    {/* Trazo diagonal tipo “tache” para formar LOX */}
    <line x1="28" y1="28" x2="72" y2="72" />
  </svg>
);

export default AppLogoIcon;
