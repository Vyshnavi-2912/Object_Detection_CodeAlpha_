/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0a0f1d',
          card: 'rgba(16, 22, 34, 0.65)',
          border: 'rgba(255, 255, 255, 0.08)',
          glow: '#00f2fe',
          purple: '#7c3aed',
          pink: '#ff5a5f',
          slate: '#0f172a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon-cyan': '0 0 15px rgba(0, 242, 254, 0.45)',
        'neon-purple': '0 0 15px rgba(124, 58, 237, 0.45)',
      }
    },
  },
  plugins: [],
}
