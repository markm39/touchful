/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['"Times New Roman"', 'Times', 'serif'],
        'display': ['"Times New Roman"', 'Times', 'serif'],
        'mono': ['"Times New Roman"', 'Times', 'serif'],
      },
      colors: {
        // Dallas Mavericks colors
        'mavs-blue': '#00538C',
        'mavs-navy': '#002B5E',
        'mavs-silver': '#BBC4CA',
        'mavs-light': '#C4CED4',
        'mavs-white': '#FFFFFF',
        // Glass theme
        'glass-bg': 'rgba(0, 43, 94, 0.4)',
        'glass-border': 'rgba(187, 196, 202, 0.3)',
        'glass-hover': 'rgba(0, 83, 140, 0.5)',
      },
      backdropBlur: {
        'glass': '20px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 43, 94, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-lg': '0 16px 48px rgba(0, 43, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'glow': '0 0 30px rgba(0, 83, 140, 0.5)',
      },
      animation: {
        'ripple': 'ripple 0.6s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.8' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 83, 140, 0.4)' },
          '50%': { boxShadow: '0 0 50px rgba(0, 83, 140, 0.7)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
