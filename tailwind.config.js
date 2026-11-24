/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lab: {
          950: '#06100f',
          900: '#0a1a19',
          850: '#0d2321',
          800: '#112c29',
          700: '#173d39',
          600: '#1f524c',
          500: '#2c6f67',
          400: '#45948a',
          300: '#74b9ae',
          200: '#a9d8d0',
          100: '#d8efe9',
        },
        amber: {
          300: '#f7cf72',
          400: '#f2b84b',
          500: '#e6a02a',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Mono"', '"SFMono-Regular"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 18px 50px -20px rgba(0, 0, 0, 0.65)',
        glow: '0 0 0 1px rgba(116, 185, 174, 0.25), 0 0 32px -6px rgba(69, 148, 138, 0.45)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.35)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        pulseRing: 'pulseRing 1.8s ease-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};
