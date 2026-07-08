/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#4785FF',
          DEFAULT: '#0F62FE', // IBM / Carbon blue style, premium feel
          dark: '#0043CE',
        },
        accent: {
          light: '#FF6F3C',
          DEFAULT: '#FF4A00', // iLovePDF style orange/red accent
          dark: '#E03E00',
        },
        neutralBg: '#F4F7FB', // Sleek light grey
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 8px 30px rgb(0 0 0 / 0.04)',
        'premium-hover': '0 20px 40px rgb(0 0 0 / 0.08)',
      }
    },
  },
  plugins: [],
}
