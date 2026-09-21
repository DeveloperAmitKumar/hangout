import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-40 border-b border-indigo-100 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-900/90">
        <div className="mx-auto flex h-14 md:h-16 w-full max-w-4xl items-center gap-2 px-4">
          <Link
            href="/"
            aria-label="Back to home"
            className="flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full hover:bg-indigo-50 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" aria-hidden />
          </Link>
          <h1 className="text-lg font-extrabold tracking-tight">Privacy Policy</h1>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
        <div className="prose prose-indigo dark:prose-invert max-w-none space-y-6">
          <p className="text-sm text-zinc-500">Effective Date: September 21, 2026</p>
          
          <p>
            This Privacy Policy describes how Hangout ("we", "us", or "our") collects, uses, and protects your information. Hangout is designed from the ground up to be an ephemeral, privacy-first application where data is automatically destroyed when sessions end.
          </p>

          <h2 className="text-2xl font-bold">1. Information Collection and Use</h2>
          <p>
            Hangout does not require user accounts or registration. We collect only the absolute minimum amount of information necessary to facilitate real-time communication during an active room session.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Display Names and Avatars:</strong> When you join a room, you provide a display name and optionally upload an avatar. This is used solely to identify you to other participants in the room.</li>
            <li><strong>Room Content:</strong> During an active session, we temporarily process and broadcast messages, reactions, shared photos, poll votes, and game states.</li>
            <li><strong>Technical Data:</strong> Our underlying infrastructure providers may temporarily log IP addresses, connection timestamps, and browser user-agent strings for the purpose of maintaining server security, rate-limiting, and managing WebSockets.</li>
          </ul>

          <h2 className="text-2xl font-bold">2. Local Storage and Cookies</h2>
          <p>
            Hangout <strong>does not use tracking cookies</strong> or third-party analytics pixels. We utilize your browser's local storage solely for functional purposes to improve your experience:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Profile Prefilling:</strong> We store your chosen display name and avatar locally so you don't have to re-enter them every time you join a new room.</li>
            <li><strong>Session Integrity:</strong> We securely tie your browser session to an active room to prevent duplicate seats and allow seamless re-entry if you accidentally close the tab.</li>
            <li><strong>Moderation:</strong> If a room host removes you, your browser locally records this ban to efficiently block re-entry to that specific room.</li>
          </ul>

          <h2 className="text-2xl font-bold">3. Ephemeral Data Deletion (Our Core Principle)</h2>
          <p>
            We practice aggressive data minimization. The entire premise of Hangout is temporary interaction.
          </p>
          <p>
            <strong>When a room's timer expires, or when the host manually ends the session, the room is immediately purged from our active database.</strong> This deletion includes all chat messages, member records, uploaded photos, polls, and game states associated with that room. We do not maintain archives, backups, or shadow copies of expired room content. Once it's gone, it's gone permanently.
          </p>

          <h2 className="text-2xl font-bold">4. Third-Party Infrastructure</h2>
          <p>
            To provide real-time messaging and file hosting, we utilize trusted third-party infrastructure providers (such as Supabase). These providers act as data processors on our behalf. We do not sell, rent, or share any of your information with third parties for marketing, advertising, or profiling purposes.
          </p>
          
          <h2 className="text-2xl font-bold">5. Your Rights and Data Access</h2>
          <p>
            Because Hangout does not use traditional accounts and aggressively deletes data, it is generally impossible for us to retrieve or provide access to your data once a room has expired. 
          </p>
          <p>
            During an active session, you have full access to view the data you have submitted within the room interface. You may cease using the application at any time. To clear the local data stored on your device, you can simply clear your browser's site data or local storage.
          </p>

          <h2 className="text-2xl font-bold">6. Security</h2>
          <p>
            We implement industry-standard security measures, including HTTPS encryption, to protect data in transit between your browser and our servers. While we take every precaution to secure active room data, no internet transmission is entirely secure. We advise against sharing highly sensitive personal, financial, or medical information in Hangout rooms.
          </p>

          <h2 className="text-2xl font-bold">7. Children's Privacy</h2>
          <p>
            Hangout is not intended for children under 16 years of age. We do not knowingly solicit or collect personally identifiable information from children. If we become aware that a child under 16 has provided us with personal information, we will take immediate steps to delete such information.
          </p>

          <h2 className="text-2xl font-bold">8. Changes to this Policy</h2>
          <p>
            We may update this Privacy Policy periodically to reflect changes in our practices or applicable laws. The updated version will be indicated by the "Effective Date" at the top of this page. Your continued use of Hangout constitutes acceptance of the revised policy.
          </p>
        </div>
      </main>
    </div>
  );
}
