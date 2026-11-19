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
        aiscore: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0066ff', // Signature AiScore Blue
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
          dark: '#080d19', // Deep AiScore night pitch
          card: '#0f172a',
          cardLight: '#ffffff',
          panel: '#152037',
          panelLight: '#f8fafc',
          border: '#1e2e4f',
          borderLight: '#e2e8f0',
          cyan: '#00d2ff',
          orange: '#ff6b00',
          green: '#00c853',
          red: '#ff1744',
          pair: '#0066ff',
          impair: '#e91e63',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-blue': '0 0 20px -3px rgba(0, 102, 255, 0.35)',
        'glow-green': '0 0 20px -3px rgba(0, 200, 83, 0.35)',
        'glow-orange': '0 0 20px -3px rgba(255, 107, 0, 0.35)',
      }
    },
  },
  plugins: [],
}
