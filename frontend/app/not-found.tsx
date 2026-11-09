import ErrorView from '@/components/ErrorView'

export const metadata = { title: 'Page not found' }

export default function NotFound() {
  return <ErrorView code="404" title="Page not found" text="That page does not exist, or it moved. Check the address, or head back to the start." />
}
