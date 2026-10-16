/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          main: '#050B1D',
          sidebar: '#07122A',
          panel: '#0A1933',
          card: '#0D2040',
          border: '#18345C',
          primary: '#087BFF',
          cyan: '#00C8F5',
          textMain: '#F1F5FF',
          textMuted: '#91A4C5',
          success: '#00D6A0',
          warning: '#FFB84D',
          error: '#FF5D73',
        },
        studio: {
          950: '#030712',
          900: '#050B1D', // Main background (#050B1D)
          850: '#07122A', // Sidebar background (#07122A)
          800: '#0A1933', // Panel/Card background (#0A1933)
          750: '#0D2040', // Elevated card (#0D2040)
          700: 'rgba(24, 52, 92, 0.7)', // Border (#18345C)
          600: 'rgba(91, 145, 255, 0.35)',
          500: '#5C7699', // Muted text
          400: '#91A4C5', // Secondary text (#91A4C5)
          300: '#C2D3ED',
          200: '#E4ECF8',
          100: '#F1F5FF', // Main text (#F1F5FF)
        },
        navy: {
          950: '#030712',
          900: '#050B1D', // Main background
          850: '#07122A', // Sidebar background
          800: '#0A1933', // Panel background
          700: '#0D2040', // Card background
          600: '#102A50', // Elevated panel
          500: '#18345C', // Border
        },
        brand: {
          50: '#EBF4FF',
          100: '#D6E8FF',
          200: '#ADD3FF',
          300: '#70B0FF',
          400: '#338EFF',
          500: '#087BFF', // Primary accent (Electric Blue)
          600: '#0065DB',
          700: '#004FB0',
          800: '#003B85',
          900: '#002554',
        },
        cyan: {
          300: '#67E8F9',
          400: '#00C8F5', // Secondary accent (Cyan)
          500: '#00AEE0',
          600: '#0891B2',
        },
        purple: {
          300: '#C4B5FD',
          400: '#9B8CFF',
          500: '#7865FF', // Purple accent
          600: '#634EE8',
          700: '#4F35D2',
        },
        emerald: {
          400: '#00D6A0', // Success (#00D6A0)
          500: '#10B981',
        },
        amber: {
          400: '#FFB84D', // Warning (#FFB84D)
          500: '#F59E0B',
        },
        rose: {
          400: '#FF5D73', // Error (#FF5D73)
          500: '#F43F5E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'elevated': '0 12px 36px -4px rgba(0, 0, 0, 0.65)',
        'glow-brand': '0 0 24px -2px rgba(8, 123, 255, 0.45)',
        'glow-cyan': '0 0 24px -2px rgba(0, 200, 255, 0.45)',
        'glow-purple': '0 0 24px -2px rgba(120, 101, 255, 0.45)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
    },
  },
  plugins: [],
};
