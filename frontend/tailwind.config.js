/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          900: '#431407',
        },
        surface: {
          DEFAULT: '#0f0f0f',
          card:    '#161616',
          border:  '#242424',
          hover:   '#1e1e1e',
        }
      },
    },
  },
  plugins: [],
}
