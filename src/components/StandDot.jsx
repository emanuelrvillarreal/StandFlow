import { useRef } from 'react'

const STATUS_COLORS = {
  available: '#22c55e',
  pending:   '#eab308',
  reserved:  '#ef4444',
  blocked:   '#9ca3af',
}

export default function StandDot({ stand, category, editMode, onClick, onDragEnd, mapRef }) {
  const dragging = useRef(false)
  const startPos = useRef(null)

  // Los stands reservados para Sponsors libres se ven en dorado: no son para expositores.
  const sponsorFree = stand.isSponsor && stand.status === 'available'
  const color = sponsorFree ? '#f59e0b' : category ? category.color : STATUS_COLORS[stand.status]
  const size = 22

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
        onDragEnd(stand.id, Math.max(1, Math.min(99, x)), Math.max(1, Math.min(99, y)))
      } else if (!dragging.current) {
        onClick(stand)
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
        onDragEnd(stand.id, Math.max(1, Math.min(99, x)), Math.max(1, Math.min(99, y)))
      }
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }

  return (
    <div
      className={`stand-dot ${editMode ? 'edit-mode' : ''}`}
      style={{ left: `${stand.x}%`, top: `${stand.y}%`, width: size, height: size }}
      onMouseDown={editMode ? handleMouseDown : undefined}
      onTouchStart={editMode ? handleTouchStart : undefined}
      onClick={!editMode ? () => onClick(stand) : undefined}
      title={`Stand ${stand.number}`}
    >
      <div style={{
        width: size, height: size,
        borderRadius: '50%',
        background: color,
        border: '2px solid white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          color: 'white',
          fontSize: stand.number.length > 2 ? 7 : 8,
          fontWeight: '700',
          lineHeight: 1,
          textAlign: 'center',
        }}>{stand.number}</span>
      </div>
    </div>
  )
}
