const AppLogoIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Outer hexagon frame */}
    <polygon
      points="50,8 88,30 88,70 50,92 12,70 12,30"
      stroke="currentColor"
      strokeWidth="3.5"
      fill="none"
    />
    {/* Inner stylized 'L' letterform */}
    <path
      d="M34 28 L34 72 L66 72"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Accent dot */}
    <circle cx="66" cy="72" r="4" fill="currentColor" stroke="none" />
    {/* Top accent line */}
    <line x1="34" y1="28" x2="50" y2="28" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

export default AppLogoIcon;
