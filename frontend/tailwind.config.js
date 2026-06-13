/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'risk-green': 'var(--color-risk-green)',
        'risk-yellow': 'var(--color-risk-yellow)',
        'risk-orange': 'var(--color-risk-orange)',
        'risk-red': 'var(--color-risk-red)',
        'bg-dark': 'var(--color-bg-dark)',
        'bg-card': 'var(--color-bg-card)',
        border: 'var(--color-border)',
      }
    },
  },
  plugins: [],
}
