/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#24322B',
        paper: '#FBFAF6',
        sage: {
          DEFAULT: '#5B8570',
          light: '#DCE7DE',
          dark: '#3E6350',
        },
        dusk: {
          DEFAULT: '#3B4C68',
          light: '#DDE3EC',
          dark: '#28374D',
        },
        amber: {
          DEFAULT: '#C77B3F',
          light: '#F3E1CE',
        },
        rose: {
          DEFAULT: '#B2555A',
          light: '#F2DCDD',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}
