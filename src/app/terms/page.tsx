import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
          <h1 className="text-lg font-extrabold tracking-tight">Terms and Conditions</h1>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
        <div className="prose prose-indigo dark:prose-invert max-w-none space-y-6">
          <p className="text-sm text-zinc-500">Effective Date: September 21, 2026</p>
          
          <p>
            These Terms and Conditions govern your access to and use of Hangout, a web-based ephemeral chat and playground application (the "Application"). By accessing, creating, or joining a room on Hangout, you agree to be bound by these Terms. If you do not agree to these Terms, you may not use the Application.
          </p>

          <h2 className="text-2xl font-bold">1. Nature of the Service</h2>
          <p>
            Hangout provides temporary, real-time virtual rooms. <strong>You acknowledge and agree that Hangout is an ephemeral service.</strong> All content, including but not limited to chat messages, shared photos, polls, and game states, is permanently deleted from our servers when a room's timer expires or when the room is manually ended by the host. We provide no guarantees regarding data retention, and we are not responsible for any lost data.
          </p>

          <h2 className="text-2xl font-bold">2. License to Use</h2>
          <p>
            Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, and revocable license to access and use the Application for your personal, non-commercial use. You may not modify, distribute, reverse engineer, or create derivative works based on the Application or its underlying code.
          </p>

          <h2 className="text-2xl font-bold">3. User Conduct and Acceptable Use</h2>
          <p>
            You are solely responsible for your conduct and any content you submit or share within a Hangout room. You agree that you will not use the Application to:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Upload, share, or transmit any content that is unlawful, defamatory, harassing, abusive, fraudulent, or obscene.</li>
            <li>Infringe upon the intellectual property rights, privacy rights, or other legal rights of any third party.</li>
            <li>Distribute spam, malware, phishing links, or any other harmful code.</li>
            <li>Impersonate any person or entity or falsely state your affiliation with a person or entity.</li>
            <li>Engage in any activity that disrupts or interferes with the proper functioning of the Application.</li>
          </ul>

          <h2 className="text-2xl font-bold">4. Host Controls and Moderation</h2>
          <p>
            Hangout relies on decentralized, user-led moderation. The user who creates a room (the "Host") is granted specific administrative privileges for that room.
          </p>
          <p>
            <strong>Hosts have the unilateral right to remove (kick) any user from their room at any time, for any reason.</strong> Being removed by a host results in a ban from that specific room. We do not actively monitor or mediate disputes between users and hosts. However, we reserve the right to terminate rooms or block IP addresses that violate these Terms or applicable laws.
          </p>

          <h2 className="text-2xl font-bold">5. User-Generated Content License</h2>
          <p>
            While you retain ownership of any content you transmit through the Application, you grant Hangout a temporary, worldwide, royalty-free license to process, host, and display that content solely for the purpose of operating the active room session. This license automatically expires when the room is purged.
          </p>

          <h2 className="text-2xl font-bold">6. Disclaimers</h2>
          <p>
            THE APPLICATION IS PROVIDED ON AN "AS-IS" AND "AS-AVAILABLE" BASIS. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APPLICATION WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
          </p>

          <h2 className="text-2xl font-bold">7. Limitation of Liability</h2>
          <p>
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL HANGOUT, ITS CREATORS, OR ITS AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE APPLICATION; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE APPLICATION; OR (C) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.
          </p>

          <h2 className="text-2xl font-bold">8. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Hangout and its creators from and against any claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney's fees) arising from: (a) your use of and access to the Application; (b) your violation of any term of these Terms; or (c) your violation of any third-party right, including without limitation any copyright, property, or privacy right.
          </p>

          <h2 className="text-2xl font-bold">9. Modifications to the Service and Terms</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue the Application (or any part thereof) at any time with or without notice. We may also revise these Terms from time to time. The most current version will always be posted here. By continuing to access or use the Application after revisions become effective, you agree to be bound by the revised Terms.
          </p>
        </div>
      </main>
    </div>
  );
}
