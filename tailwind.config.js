export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#F9F5FC',
          100: '#F0E6F7',
          200: '#DFCEEC',
          300: '#C7AADE',
          400: '#AB82CE',
          500: '#8C57BE',
          600: '#613087', // Brand Purple
          700: '#4D246D',
          800: '#3A1A54',
          900: '#2A103D',
          950: '#1C0629',
        },
        brand: {
          purple: '#613087',
          orange: {
            dark: '#DD5A28',
            DEFAULT: '#F48220',
            light: '#FCB715',
          }
        }
      },
      fontFamily: {
        logo: ['"UTM Aurora"', 'Oswald', 'sans-serif'],
        secondary: ['"UTM Aurora"', 'Oswald', 'sans-serif'],
        sans: ['"UTM Aurora"', 'Oswald', 'sans-serif'],
      }
    }
  },
  plugins: []
}
