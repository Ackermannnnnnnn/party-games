/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Iris : actions, sélections
        brand: {
          DEFAULT: '#7b61ff',
          dark: '#6246ea',
          light: '#b4a5ff',
        },
        // Jaune « jeton » : réservé aux moments clés (créer une room, code de la room)
        token: {
          DEFAULT: '#ffc93c',
          dark: '#f0b400',
          ink: '#1a1405',
        },
        // Neutres teintés violet (remplacent le gris-bleu « slate » partout dans l'app)
        slate: {
          50: '#f6f5fb',
          100: '#eceaf5',
          200: '#d9d6e8',
          300: '#b9b5cf',
          400: '#8f8aa8',
          500: '#6c6785',
          600: '#4d4964',
          700: '#36334a',
          800: '#221f2e',
          900: '#16141e',
          950: '#0e0d14',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Inter Variable"', 'sans-serif'],
        hand: ['"Patrick Hand"', '"Comic Sans MS"', 'cursive'],
      },
    },
  },
  plugins: [],
};
