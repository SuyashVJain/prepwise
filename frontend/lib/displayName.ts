// Display name rules: pure, so they can be tested without a browser. Used by Settings before saving to the profile.

export const NAME_MAX = 40

// Removes control characters and HTML (script and style blocks with their content, then any other tags and stray
// angle brackets), collapses whitespace and trims. `error` is empty when the name can be saved.
export function cleanDisplayName(input: string): { value: string; error: string } {
  const value = String(input ?? '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!value) return { value, error: 'Enter a name.' }
  if (value.length > NAME_MAX) return { value, error: `Use ${NAME_MAX} characters or fewer.` }
  return { value, error: '' }
}
