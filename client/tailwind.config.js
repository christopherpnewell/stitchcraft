/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f8',
          100: '#fce7f1',
          200: '#fbd0e4',
          300: '#f9a8cc',
          400: '#f472aa',
          500: '#eb4589',
          600: '#d92668',
          700: '#bc1a51',
          800: '#9b1943',
          900: '#811a3b',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [],
};
