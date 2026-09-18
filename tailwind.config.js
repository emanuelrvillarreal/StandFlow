export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07070d',
          900: '#0b0b16',
          800: '#12121f',
          700: '#1a1a2b',
          600: '#26263d',
          500: '#3a3a57',
        },
        // Gris claro para texto secundario sobre fondo oscuro (ink-500 es
        // muy oscuro y casi no contrasta; esto es lo que se usa para textos).
        muted: {
          DEFAULT: '#a8a8cc',
          dim: '#83839f',
        },
        accent: {
          DEFAULT: '#2ee6d6',
          soft: '#7ff3e9',
          dim: 'rgba(46, 230, 214, 0.16)',
        },
        accent2: {
          DEFAULT: '#ff4fd8',
          dim: 'rgba(255, 79, 216, 0.16)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(46, 230, 214, 0.25), 0 0 24px rgba(46, 230, 214, 0.15)',
      },
    },
  },
  plugins: []
}
