const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

// Short, always-visible help for the microphone prompt. Plain details element, so it works without scripts.
export default function MicHelp({ blocked = false }: { blocked?: boolean }) {
  return (
    <details open={blocked} style={{ marginBottom: '12px' }}>
      <summary style={{ ...mono, fontSize: '12px', letterSpacing: '.06em', color: blocked ? '#f59e0b' : 'var(--text-2)', cursor: 'pointer', minHeight: '32px', display: 'flex', alignItems: 'center' }}>
        {blocked ? 'MICROPHONE BLOCKED: HOW TO FIX IT' : 'MICROPHONE HELP'}
      </summary>
      <ul style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, paddingLeft: '20px', marginTop: '4px' }}>
        <li>Use Chrome or Edge on a laptop or desktop.</li>
        <li>Click Allow when the browser asks to use the microphone.</li>
        <li>If you clicked Block: click the lock icon next to the address, set Microphone to Allow, then reload the page.</li>
        <li>No microphone? Type your answer instead. Nothing else changes.</li>
      </ul>
    </details>
  )
}
