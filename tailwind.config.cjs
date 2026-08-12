/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./electron/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#0db9f2",
        "primary-dark": "#098fb5",
        "background-light": "#f5f8f8",
        "background": "#101e22",
        "background-dark": "#101e22",
        "background-darker": "#0a1316",
        "surface": "#16262c",
        "surface-dark": "#16262c",
        "surface-light": "#223f49",
        "border-dark": "#223f49",
        "subtle": "#223f49",
        "text-primary": "#F0FFF4",
        "text-secondary": "#b8e2f2",
        "text-muted": "#6c8d99",
        "accent": "#0db9f2",
        "danger": "#F87171",
        "success": "#4ADE80",
        "warning": "#FBBF24",
      },
      fontFamily: {
        "sans": ["Inter", "sans-serif"],
        "display": ["Inter", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glow": "0 0 10px rgba(13, 185, 242, 0.3)",
        "glow-active": "0 0 30px rgba(13, 185, 242, 0.3)",
        "glow-accent": "0 0 15px rgba(13, 185, 242, 0.4)",
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bubble': {
            '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
            '50%': { transform: 'scale(1.1)', opacity: '1' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'fade-in-fast': 'fade-in-fast 0.1s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bubble': 'bubble 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
