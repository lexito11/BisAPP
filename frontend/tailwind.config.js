/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          dark: '#4338CA',
          light: '#6366F1',
        },
        green: {
          DEFAULT: '#047858',
          light: '#059669',
          dark: '#065F46',
        },
      },
      fontSize: {
        'xs': ['0.875rem', { lineHeight: '1.5' }],      // 14px
        'sm': ['1rem', { lineHeight: '1.5' }],           // 16px (antes 14px)
        'base': ['1.125rem', { lineHeight: '1.6' }],     // 18px (antes 16px)
        'lg': ['1.25rem', { lineHeight: '1.6' }],        // 20px (antes 18px)
        'xl': ['1.5rem', { lineHeight: '1.6' }],         // 24px (antes 20px)
        '2xl': ['1.875rem', { lineHeight: '1.5' }],      // 30px (antes 24px)
        '3xl': ['2.25rem', { lineHeight: '1.4' }],       // 36px (antes 30px)
        '4xl': ['3rem', { lineHeight: '1.3' }],          // 48px (antes 36px)
      },
    },
  },
  plugins: [],
}
