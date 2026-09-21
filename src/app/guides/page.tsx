import Link from "next/link";
import { ArrowLeft, Clock, Gamepad2, Image as ImageIcon, MessageCircle, Shield, Users } from "lucide-react";

export default function GuidesPage() {
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
          <h1 className="text-lg font-extrabold tracking-tight">Hangout Guides & Docs</h1>
        </div>
      </header>
      
      <main className="mx-auto max-w-4xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
        <div className="prose prose-indigo dark:prose-invert max-w-none">
          <p className="text-lg text-zinc-500 mb-8">
            Learn everything you need to know to create, manage, and enjoy your ephemeral spaces on Hangout.
          </p>
          
          <div className="grid gap-8 md:grid-cols-2">
            <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Clock className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold m-0">The Basics: Ephemeral Rooms</h2>
              </div>
              <p className="text-sm">
                Hangout rooms are temporary. When creating a room, the host selects a duration (e.g., 30 mins, 1 hour). A countdown timer will appear at the top. Once the timer hits zero, the room immediately becomes read-only, and all messages, photos, and game data are permanently deleted from our servers.
              </p>
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Shield className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold m-0">Host Controls & Moderation</h2>
              </div>
              <p className="text-sm">
                If you created the room, you are the <strong>Host</strong>. The host has special privileges accessible via the ⚙️ Settings button:
              </p>
              <ul className="text-sm list-disc pl-4 mt-2">
                <li>Rename the room at any time.</li>
                <li>Remove (kick) users. A removed user is permanently banned from re-entering that specific room.</li>
                <li>Unblock previously banned users.</li>
                <li>End the session early, immediately locking the room for everyone.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold m-0">Chatting & Photos</h2>
              </div>
              <p className="text-sm">
                The main chat is visible to everyone in the room. You can share text, emojis, and upload images (JPG, PNG, WEBP up to 5MB). 
                Want to speak privately? Head to the <strong>Members</strong> tab and click the chat icon next to someone's name to start a secure 1-on-1 private thread.
              </p>
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Gamepad2 className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold m-0">Mini Games</h2>
              </div>
              <p className="text-sm">
                Under the <strong>Games</strong> tab, you can play synchronized games:
              </p>
              <ul className="text-sm list-disc pl-4 mt-2">
                <li><strong>Tic Tac Toe:</strong> Challenge a specific member. Others can spectate the match in real-time.</li>
                <li><strong>Word Guess:</strong> A cooperative/competitive game where the room tries to guess a hidden word. Type your guesses in the attached game-chat!</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
