/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          950: '#061820',
          900: '#0D2B38',
          800: '#1A4D62',
          700: '#1A5F7A',   // primary — "Gig" color
          600: '#2A7A98',
          500: '#3A9AB8',
          400: '#5BBFCF',
          100: '#E8F7FA',
          50:  '#F2FBFC',
        },
        orange: {
          700: '#C55F0A',
          600: '#E8741A',   // primary — "Huz" color
          500: '#F49430',
          400: '#F7A850',
          100: '#FEF3E8',
          50:  '#FFFAF5',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F8FBFC',
          border: '#E5EEF1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
