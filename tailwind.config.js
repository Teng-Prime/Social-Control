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
        studio: {
          950: '#030712',
          900: '#050B1F', // Main background (#050B1F)
          850: '#07112A', // Sidebar background (#07112A)
          800: '#0B1D3B', // Card background (#0B1D3B)
          750: '#102A50', // Elevated panel (#102A50)
          700: 'rgba(91, 145, 255, 0.22)',
          600: 'rgba(91, 145, 255, 0.35)',
          500: '#5C7699', // Muted text
          400: '#91A6C7', // Secondary text (#91A6C7)
          300: '#C2D3ED',
          200: '#E4ECF8',
          100: '#F4F7FF', // Main text (#F4F7FF)
        },
        navy: {
          950: '#030712',
          900: '#050B1F', // Main background
          850: '#07112A', // Sidebar background
          800: '#081633', // Secondary background
          700: '#0B1D3B', // Card background
          600: '#102A50', // Elevated panel
          500: '#183A6D',
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
          400: '#00C8FF', // Secondary accent (Cyan)
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
          400: '#16D9A0', // Success (#16D9A0)
          500: '#10B981',
        },
        amber: {
          400: '#FFBE55', // Warning (#FFBE55)
          500: '#F59E0B',
        },
        rose: {
          400: '#FF5C7A', // Error (#FF5C7A)
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
