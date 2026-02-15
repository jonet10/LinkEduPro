/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{js,ts,jsx,tsx}', './src/components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5faf8',
          100: '#dbefe7',
          500: '#1f7a5a',
          700: '#15543e',
          900: '#0f3528'
        },
        accent: '#d98e04'
      }
    }
  },
  plugins: []
};
