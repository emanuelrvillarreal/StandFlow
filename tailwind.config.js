export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Referencian variables CSS (definidas en :root, en index.css) para
        // que un evento pueda pisarlas con su propia paleta sin tocar estas
        // clases ni recompilar nada (ver src/lib/eventTheme.js).
        ink: {
          950: 'var(--ink-950)',
          900: 'var(--ink-900)',
          800: 'var(--ink-800)',
          700: 'var(--ink-700)',
          600: 'var(--ink-600)',
          500: 'var(--ink-500)',
        },
        // Gris claro para texto secundario sobre fondo oscuro (ink-500 es
        // muy oscuro y casi no contrasta; esto es lo que se usa para textos).
        muted: {
          DEFAULT: 'var(--muted)',
          dim: 'var(--muted-dim)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          dim: 'var(--accent-dim)',
        },
        accent2: {
          DEFAULT: 'var(--accent2)',
          dim: 'var(--accent2-dim)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px var(--accent-ring), 0 0 24px var(--accent-glow)',
      },
    },
  },
  plugins: []
}
