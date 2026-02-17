/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{js,ts,jsx,tsx}', './src/components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf5ff',
          100: '#d9e9ff',
          500: '#0f6db8',
          700: '#0b4f8d',
          900: '#08355f'
        },
        accent: '#f07610',
        edu: '#f07610',
        pro: '#2f9e44'
      }
    }
  },
  plugins: []
};
