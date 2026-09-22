// Pie de marca para las pantallas públicas (login, registro, eventos, Sponsor).
// No va en el panel de administración: ahí es una herramienta de trabajo, no hace falta.
export default function BrandFooter({ className = '' }) {
  return (
    <footer className={`text-center text-[11px] text-muted/70 py-6 px-4 leading-relaxed ${className}`}>
      <p>© {new Date().getFullYear()} Stands Flow. Todos los derechos reservados.</p>
      <p>
        Creado por Emanuel Villarreal ·{' '}
        <a href="https://instagram.com/emaa_villarreal" target="_blank" rel="noreferrer"
          className="hover:text-accent-soft transition">
          @emaa_villarreal
        </a>
      </p>
    </footer>
  )
}
