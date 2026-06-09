import { useEffect, useRef, useState } from 'react';

const CAMERA_URL = import.meta.env.VITE_CAMERA_URL as string | undefined;

type Size = 'small' | 'medium' | 'large';

const SIZES: Record<Size, { width: number; height: number; label: string }> = {
  small:  { width: 240, height: 135, label: 'S' },
  medium: { width: 360, height: 203, label: 'M' },
  large:  { width: 480, height: 270, label: 'L' },
};

export function CameraOverlay() {
  const [visible, setVisible] = useState(true);
  const [size, setSize] = useState<Size>('small');
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - dragOffset.current.dx, y: e.clientY - dragOffset.current.dy });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  if (!CAMERA_URL) return null;

  const { width, height } = SIZES[size];

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        title="Prikaži kameru Kamenari"
        style={{
          position: 'absolute',
          top: pos.y,
          left: pos.x,
          zIndex: 1100,
          background: 'rgba(15,23,42,0.92)',
          border: '1px solid rgba(56,189,248,0.35)',
          borderRadius: 8,
          color: '#38bdf8',
          fontSize: 13,
          fontWeight: 600,
          padding: '6px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backdropFilter: 'blur(6px)',
        }}
      >
        <span>📷</span> Kamera
      </button>
    );
  }

  // AXIS MJPEG stream — živi feed bez pollinga
  const streamUrl = imgError
    ? null
    : `${CAMERA_URL}/axis-cgi/mjpg/video.cgi?resolution=${width}x${height}&compression=30`;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: pos.y,
        left: pos.x,
        width,
        zIndex: 1100,
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(56,189,248,0.3)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        userSelect: 'none',
      }}
    >
      {/* Naslovna traka — drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 8px',
          background: 'rgba(15,23,42,0.98)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: '#38bdf8' }}>📷</span>
          Kamenari — AXIS Q6075-E
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(SIZES) as Size[]).map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              style={{
                background: size === s ? 'rgba(56,189,248,0.2)' : 'transparent',
                border: `1px solid ${size === s ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 4,
                color: size === s ? '#38bdf8' : '#64748b',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 5px',
                cursor: 'pointer',
                lineHeight: '14px',
              }}
            >
              {SIZES[s].label}
            </button>
          ))}
          <button
            onClick={() => setVisible(false)}
            title="Sakrij"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: 14,
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Video sadržaj */}
      <div style={{ width, height, background: '#0a0f1a', position: 'relative' }}>
        {streamUrl ? (
          <img
            key={size}
            src={streamUrl}
            width={width}
            height={height}
            onError={() => setImgError(true)}
            style={{ display: 'block', objectFit: 'cover' }}
            alt="AXIS kamera Kamenari"
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: '#475569',
            fontSize: 12,
          }}>
            <span style={{ fontSize: 28 }}>📷</span>
            <span>Kamera nedostupna</span>
            <button
              onClick={() => setImgError(false)}
              style={{
                background: 'rgba(56,189,248,0.1)',
                border: '1px solid rgba(56,189,248,0.3)',
                borderRadius: 6,
                color: '#38bdf8',
                fontSize: 11,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Pokušaj ponovo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
