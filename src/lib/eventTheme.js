// Paleta del evento: a partir de UN color de acento elegido por el admin,
// se deriva automáticamente el resto (fondo oscuro, variantes claras/suaves,
// color secundario), para que toda la pantalla del mapa/reserva de ese
// evento tenga una paleta coherente sin que haga falta elegir 10 colores.
// Si el evento no tiene color propio, no se aplica nada y queda la paleta
// default de Deckaria (definida en :root, en index.css).

const DEFAULT_ACCENT = '#2ee6d6'
const DEFAULT_ACCENT2 = '#ff4fd8'

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2
  if (max === min) { h = 0; s = 0 } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4; break
    }
    h *= 60
  }
  return [h, s * 100, l * 100]
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360
  s = clamp(s, 0, 100) / 100
  l = clamp(l, 0, 100) / 100
  if (s === 0) { const v = l * 255; return [v, v, v] }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hk = h / 360
  return [
    hue2rgb(p, q, hk + 1 / 3) * 255,
    hue2rgb(p, q, hk) * 255,
    hue2rgb(p, q, hk - 1 / 3) * 255,
  ]
}

function hexToHsl(hex) { return rgbToHsl(hexToRgb(hex)) }
function hslToHex(h, s, l) { return rgbToHex(hslToRgb(h, s, l)) }

// Devuelve el mapa de variables CSS a aplicar, o null si hay que usar la
// paleta default (sin override inline).
export function getEventThemeVars(accentHex) {
  if (!accentHex || !/^#[0-9a-fA-F]{3,6}$/.test(accentHex)) return null

  const [h, s] = hexToHsl(accentHex)
  const [defaultHue] = hexToHsl(DEFAULT_ACCENT)
  const hueShift = h - defaultHue

  const accentRgb = hexToRgb(accentHex)
  const accentSoft = hslToHex(h, Math.max(s, 45), 80)

  const [h2, s2, l2] = hexToHsl(DEFAULT_ACCENT2)
  const accent2 = hslToHex(h2 + hueShift, s2, l2)
  const accent2Rgb = hexToRgb(accent2)

  // Fondo oscuro con un tinte sutil del color elegido (no puro gris, pero
  // tampoco tan saturado como el acento: sigue siendo "de fondo").
  const inkSat = clamp(s * 0.35, 0, 32)
  const ink = {
    950: hslToHex(h, inkSat, 4),
    900: hslToHex(h, inkSat, 7),
    800: hslToHex(h, inkSat, 11),
    700: hslToHex(h, inkSat, 15.5),
    600: hslToHex(h, inkSat, 21.5),
    500: hslToHex(h, inkSat, 28),
  }

  return {
    '--ink-950': ink[950], '--ink-900': ink[900], '--ink-800': ink[800],
    '--ink-700': ink[700], '--ink-600': ink[600], '--ink-500': ink[500],
    '--muted': hslToHex(h, 22, 73), '--muted-dim': hslToHex(h, 16, 57),
    '--accent': accentHex, '--accent-soft': accentSoft,
    '--accent-dim': `rgba(${accentRgb.join(',')}, 0.16)`,
    '--accent-ring': `rgba(${accentRgb.join(',')}, 0.25)`,
    '--accent-glow': `rgba(${accentRgb.join(',')}, 0.15)`,
    '--accent2': accent2, '--accent2-dim': `rgba(${accent2Rgb.join(',')}, 0.16)`,
  }
}
