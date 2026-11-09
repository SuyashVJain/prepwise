import { ImageResponse } from 'next/og'

export const alt = 'Prepwise - Prep smarter. Not generic.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// A plain generated card for link previews: no photos, no logos of anyone else.
export default function OpenGraphImage() {
  const bars = [160, 300, 380, 240, 320]
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#0e0e0e', color: '#f2f2f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 120 }}>
          {bars.map((h, i) => <div key={i} style={{ width: 22, height: h / 3.2, background: '#d4fe42' }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, textTransform: 'uppercase' }}>Prep smarter.</div>
          <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, textTransform: 'uppercase', color: '#d4fe42' }}>Not generic.</div>
          <div style={{ fontSize: 32, color: '#adaaaa', marginTop: 28 }}>Mock interviews that fact-check every answer.</div>
        </div>
      </div>
    ),
    size,
  )
}
