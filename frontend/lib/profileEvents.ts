// Tells the rest of the page that the display name changed, so the sidebar and greeting update without a reload.
export const NAME_EVENT = 'pw:display-name'

export function announceName(name: string): void {
  window.dispatchEvent(new CustomEvent<string>(NAME_EVENT, { detail: name }))
}
