/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marca: {
          verde: '#1C5A34',
          rojo: '#8A2733',
          'gris-oscuro': '#6D6D6D',
          'gris-claro': '#BEBEBE',
          rosa: '#F9D7E0',
          marron: '#B26A46',
          dorado: '#BB913D',
          'verde-fosfo': 'rgb(0, 236, 111)',
          texto: '#262626',
          linea: '#E4E4E4',
          superficie: '#F5F5F5',
          'verde-suave': '#E8F0EB',
        },
        agrotec: {
          50:  '#E8F0EB',
          100: '#dcebe1',
          200: '#b9d7c3',
          300: '#8dbd9e',
          400: '#5ea077',
          500: '#2d8a4e',
          600: '#1f7040',
          700: '#1C5A34',
          800: '#1C5A34',
          900: '#144125',
          950: '#0c2716',
        },
      },
      fontFamily: {
        sans: ['Gabarito', '"Segoe UI"', 'Arial', 'sans-serif'],
        gabarito: ['Gabarito', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
      },
      backgroundSize: {
        'shimmer-size': '200% 100%',
      },
    },
  },
  plugins: [],
};
