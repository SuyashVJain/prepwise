import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { LegalSection } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Prepwise stores, what it sends to other services, and how to delete your data.',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="9 November 2026">
      <LegalSection title="What we store">
        <p>When you sign up we store your email address and the name, university and semester you enter. When you use the app we store your syllabus text and the topics taken from it, your interview sessions, the questions you were asked, your answers, scores, feedback and the claim checks, how long each answer took, and any voice tutor notes you save.</p>
        <p>This data is kept in a hosted database (Supabase) and is tied to your account. Each account can only read its own rows. Your sign-in session is kept in a browser cookie, and a few preferences, such as your default session settings, are kept in your browser&apos;s local storage.</p>
      </LegalSection>
      <LegalSection title="What we send to other services">
        <p>To write questions and to score answers, the text of your answers, the questions, and short excerpts of your syllabus are sent to a language model provider. Voice tutor conversations are sent the same way as text.</p>
        <p>Voice audio is handled by a speech provider. Depending on how the service is set up, that is either speech models running on our own server or a cloud speech service. If you use voice answers in the interview screen, your browser&apos;s own speech recognition is used, and the browser maker may process that audio under its own policy.</p>
        <p>We do not sell your data and we do not run advertising or analytics trackers.</p>
      </LegalSection>
      <LegalSection title="Deleting your data">
        <p>In Settings, the Delete my data button removes all of your sessions, answers and voice tutor notes. Your account, profile and uploaded syllabus remain until you ask us to remove them: use the contact link at the bottom of the home page and we will delete the account and the rest of your data on request.</p>
        <p>Data already sent to the language and speech providers is handled under their own retention rules, which we do not control.</p>
      </LegalSection>
      <LegalSection title="Please do not share sensitive information">
        <p>Do not put passwords, ID numbers or other sensitive personal information into answers, notes or uploaded documents.</p>
      </LegalSection>
      <LegalSection title="Changes">
        <p>If this changes in a way that matters, the date at the top will change. See also the <Link href="/terms" style={{ color: 'var(--lime)' }}>Terms</Link>.</p>
      </LegalSection>
    </LegalPage>
  )
}
