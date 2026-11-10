import Sidebar from '@/components/Sidebar'

// The shared frame for every signed-in page: sidebar plus one content column with the same left edge,
// gutter and top padding. `full` lets a page (chat, interview) fill the height of the column instead.
export default function PageShell({ children, full = false }: { children: React.ReactNode; full?: boolean }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main" data-full={full || undefined}>
        {full ? <div className="page-wrap-full">{children}</div> : <div className="page-wrap">{children}</div>}
      </main>
    </div>
  )
}
