/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0eefe',
          200: '#bbddfc',
          300: '#81c2f9',
          400: '#40a2f3',
          500: '#1689e4',
          600: '#0a6cc2',
          700: '#0a589e',
          800: '#0e4a82',
          900: '#12406d',
          950: '#0c2848',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans JP"',
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          'Meiryo',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        elevated: '0 4px 8px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        floating: '0 12px 24px -8px rgb(0 0 0 / 0.10), 0 6px 12px -4px rgb(0 0 0 / 0.06)',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
};
