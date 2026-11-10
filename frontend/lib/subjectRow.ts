// Which pills the one-line subject row shows. Pure, so the rules can be tested without a browser.

// `candidates` are the user's subjects in their fixed order (with "All my syllabus topics" first when it exists) and
// `fit` is how many of them the row has room for. Selecting a subject that is already visible never changes the
// row: only the highlight moves. A selected subject that is not visible takes the place of the LAST visible pill,
// never one in the middle, so the pills before it keep their positions.
export function visibleSubjects<T extends { value: string }>(candidates: T[], selected: T | undefined, fit: number, max = 6): T[] {
  const n = Math.max(1, Math.min(fit, max, candidates.length || 1))
  const row = candidates.slice(0, n)
  if (!selected || row.some(o => o.value === selected.value)) return row
  return [...row.slice(0, Math.max(0, n - 1)), selected]
}
