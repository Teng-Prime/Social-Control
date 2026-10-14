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
          950: '#06090e',
          900: '#0B0F17', // Darkest background
          850: '#111723', // Sidebar / panels
          800: '#172033', // Cards & elevated panels
          750: '#1E293B', // Hover / borders
          700: '#283548', // Active / borders
          600: '#3E4D65', // Subtle text / outlines
          500: '#64748B', // Muted text
          400: '#94A3B8', // Secondary text
          300: '#CBD5E1', // Primary body text
          200: '#E2E8F0', // Headings
          100: '#F1F5F9', // Crisp highlights
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          400: '#818CF8',
          500: '#6366F1', // Primary accent (Indigo)
          600: '#4F46E5',
          700: '#4338CA',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
        },
        rose: {
          400: '#FB7185',
          500: '#F43F5E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 2px 8px -2px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 24px -4px rgba(0, 0, 0, 0.5)',
        'glow-brand': '0 0 15px -3px rgba(99, 102, 241, 0.3)',
      }
    },
  },
  plugins: [],
}
