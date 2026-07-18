import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './modules/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#0b0d12',
          surface: '#12151c',
          border: '#232733',
          accent: '#5b8cff',
          text: '#e6e8ec',
          muted: '#8a90a2'
        }
      }
    }
  },
  plugins: []
}

export default config
