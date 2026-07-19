/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fifa: {
          dark: '#030d1a',      // Primary Deep Dark Blue
          card: '#0a192f',      // Darker Slate Blue card background
          glass: 'rgba(10, 25, 47, 0.7)',
          accent: '#0df270',    // Secondary FIFA Emerald Green
          accentHover: '#00cc55',
          gold: '#fcc419',      // Gold alerts
          textPrimary: '#ffffff',
          textSecondary: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
  darkMode: 'class'
}
