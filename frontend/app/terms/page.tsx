import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { LegalSection } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The rules for using Prepwise, an interview practice tool.',
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="9 November 2026">
      <LegalSection title="What this is">
        <p>Prepwise is a tool for practising interviews. It is offered as it is, with no promise that it will always be available, free of mistakes, or kept running.</p>
      </LegalSection>
      <LegalSection title="Scores are estimates">
        <p>Questions and scores are produced by a language model, which can be wrong. A score is a practice signal, not a judgement of your ability and not a prediction of any real interview.</p>
      </LegalSection>
      <LegalSection title="Your content">
        <p>You keep ownership of what you write and upload. You allow the service to store it and to send it to the providers described in the <Link href="/privacy" style={{ color: 'var(--lime)' }}>Privacy</Link> page so that the features work. Only upload material you have the right to use.</p>
      </LegalSection>
      <LegalSection title="Fair use">
        <p>Each scored answer costs money to run, so there are usage limits per account. Do not try to get around them, attack the service, scrape it, or use it to produce harmful content. We may limit or close accounts that do.</p>
      </LegalSection>
      <LegalSection title="Changes and ending">
        <p>The service and these terms can change, and the service can be closed. You can delete your data at any time as described in Privacy.</p>
      </LegalSection>
      <LegalSection title="Liability">
        <p>To the extent the law allows, the project owner is not liable for losses that come from using, or being unable to use, the service.</p>
      </LegalSection>
    </LegalPage>
  )
}
