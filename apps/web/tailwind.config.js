/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6f4',
          100: '#cde4df',
          200: '#a3cec7',
          300: '#72b5ac',
          400: '#4d9e94',
          500: '#3a887e',
          600: '#2e7169',  // main accent — approx oklch(0.56 0.09 160)
          700: '#245a54',
          800: '#1a4340',
          900: '#102d2a',
        },
        surface: '#FAFAF7',
        ink:    '#0F1410',
      },
      borderRadius: {
        sm:  '8px',
        md:  '12px',
        lg:  '16px',
        xl:  '20px',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
