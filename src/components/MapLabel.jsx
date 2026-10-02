import { useRef } from 'react'

export default function MapLabel({ label, editMode, onClick, onDragEnd, mapRef }) {
  const dragging = useRef(false)
  const startPos = useRef(null)

  function handleMouseDown(e) {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()
    dragging.current = false
    startPos.current = { x: e.clientX, y: e.clientY }

    function onMouseMove(me) {
      if (Math.abs(me.clientX - startPos.current.x) > 3 || Math.abs(me.clientY - startPos.current.y) > 3) {
        dragging.current = true
      }
    }
    function onMouseUp(me) {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      if (dragging.current && mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect()
        const x = ((me.clientX - rect.left) / rect.width) * 100
        const y = ((me.clientY - rect.top) / rect.height) * 100
        onDragEnd(label.id, Math.max(1, Math.min(99, x)), Math.max(1, Math.min(99, y)))
      } else if (!dragging.current) {
        onClick(label)
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function handleTouchStart(e) {
    if (!editMode) return
    e.stopPropagation()
    const touch = e.touches[0]
    dragging.current = false
    startPos.current = { x: touch.clientX, y: touch.clientY }

    function onTouchMove(te) {
      const t = te.touches[0]
      if (Math.abs(t.clientX - startPos.current.x) > 5 || Math.abs(t.clientY - startPos.current.y) > 5) {
        dragging.current = true
        te.preventDefault()
      }
    }
    function onTouchEnd(te) {
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      if (dragging.current && mapRef.current) {
        const t = te.changedTouches[0]
        const rect = mapRef.current.getBoundingClientRect()
        const x = ((t.clientX - rect.left) / rect.width) * 100
        const y = ((t.clientY - rect.top) / rect.height) * 100
        onDragEnd(label.id, Math.max(1, Math.min(99, x)), Math.max(1, Math.min(99, y)))
      }
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }

  return (
    <div
      className={`map-label ${editMode ? 'edit-mode' : ''}`}
      style={{ left: `${label.x}%`, top: `${label.y}%` }}
      onMouseDown={editMode ? handleMouseDown : undefined}
      onTouchStart={editMode ? handleTouchStart : undefined}
      title={editMode ? 'Arrastrar para mover · click para editar' : label.text}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border border-white/30 shadow whitespace-nowrap inline-block"
        style={{
          background: label.color || '#0b0b16',
          color: (label.color || '#0b0b16').toLowerCase() === '#ffffff' ? '#0b0b16' : '#ffffff',
          transform: `rotate(${label.rotation || 0}deg)`,
        }}
      >
        {label.text}
      </span>
    </div>
  )
}
