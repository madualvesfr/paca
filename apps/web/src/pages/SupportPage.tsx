import { LegalLayout } from "@/components/layout/LegalLayout";

export function SupportPage() {
  return (
    <LegalLayout title="Support" updated="May 10, 2026">
      <p>
        Questions, bugs, or feedback? We're a small team — we read every email
        and try to reply within 2 business days.
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:thelucasdkp@gmail.com">thelucasdkp@gmail.com</a>
        <br />
        Response time: typically within 48 hours, slower on weekends.
      </p>

      <h2>Common questions</h2>

      <h3>How do I delete my account?</h3>
      <p>
        Open the app → Profile → scroll to "Danger zone" → tap "Delete account".
        Your personal data is permanently removed. If you're in a couple, your
        partner keeps the shared transactions you've co-authored, but your
        name is removed from them.
      </p>

      <h3>The receipt scan got a value wrong.</h3>
      <p>
        OCR is imperfect. After scanning, every field is editable on the
        review screen — adjust the description, amount, or category and tap
        save. The wrong value never reaches the database without your
        confirmation.
      </p>

      <h3>How does couple sharing work?</h3>
      <p>
        After you create a couple, share your invite code with your partner.
        Once they join, transactions, budgets, and shared categories you create
        in "Couple" mode are visible to both of you. Anything created in
        "Personal" mode stays private to you.
      </p>

      <h3>Why does the app ask for camera/photo access?</h3>
      <p>
        Only for the receipt scan feature. We send the chosen image to Google
        Gemini for OCR, then discard it. We never store images on our servers
        or access your library beyond the single image you pick.
      </p>

      <h3>Is my data backed up?</h3>
      <p>
        Yes. Data lives in Supabase (Postgres on AWS) with daily backups. We
        recommend you also export a CSV from Profile → Export periodically if
        the data is important to you.
      </p>

      <h3>How do I report a bug?</h3>
      <p>
        Email us with: what you were doing, what you expected, what happened,
        and your device (iPhone model + iOS version). Screenshots help a lot.
      </p>

      <h2>Privacy and terms</h2>
      <p>
        See <a href="/privacy">Privacy Policy</a> and{" "}
        <a href="/terms">Terms of Use</a>.
      </p>
    </LegalLayout>
  );
}
