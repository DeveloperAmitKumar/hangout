import type {
  GameSession,
  Member,
  Message,
  Poll,
  PrivateMessage,
  PrivateThread,
  Room,
} from "@/types";

const now = Date.now();
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
const mins = (m: number) => m * 60 * 1000;

export const mockRoom: Room = {
  id: "room_demo123",
  name: "Friday Movie Night",
  hostId: "m_anya",
  sessionDurationMinutes: 60,
  createdAt: iso(-mins(18)),
  // ~42 min left so the countdown visibly ticks during review
  expiresAt: iso(mins(42)),
  inviteToken: "demo123",
  inviteLink: "http://localhost:3000/join/demo123",
  visibility: "private",
  hasPassword: false,
};

export const mockMembers: Member[] = [
  {
    id: "m_anya",
    roomId: mockRoom.id,
    displayName: "Anya",
    avatarUrl: "https://i.pravatar.cc/96?img=47",
    isHost: true,
    isOnline: true,
    joinedAt: iso(-mins(18)),
  },
  {
    id: "m_ravi",
    roomId: mockRoom.id,
    displayName: "Ravi",
    avatarUrl: "https://i.pravatar.cc/96?img=12",
    isHost: false,
    isOnline: true,
    joinedAt: iso(-mins(16)),
  },
  {
    id: "m_mei",
    roomId: mockRoom.id,
    displayName: "Mei",
    avatarUrl: "https://i.pravatar.cc/96?img=32",
    isHost: false,
    isOnline: true,
    joinedAt: iso(-mins(14)),
  },
  {
    id: "m_leo",
    roomId: mockRoom.id,
    displayName: "Leo",
    avatarUrl: "https://i.pravatar.cc/96?img=59",
    isHost: false,
    isOnline: false,
    joinedAt: iso(-mins(10)),
  },
  {
    id: "m_sam",
    roomId: mockRoom.id,
    displayName: "Sam",
    avatarUrl: "https://i.pravatar.cc/96?img=15",
    isHost: false,
    isOnline: true,
    joinedAt: iso(-mins(6)),
  },
];

export const mockMessages: Message[] = [
  {
    id: "msg_01",
    roomId: mockRoom.id,
    senderId: null,
    type: "system",
    content: "Anya created the playground · 60 min session",
    reactions: {},
    createdAt: iso(-mins(18)),
  },
  {
    id: "msg_02",
    roomId: mockRoom.id,
    senderId: "m_anya",
    type: "text",
    content: "Welcome everyone! 🎬 Drop your movie picks below",
    reactions: { "❤️": ["m_ravi", "m_mei"] },
    createdAt: iso(-mins(17)),
  },
  {
    id: "msg_03",
    roomId: mockRoom.id,
    senderId: null,
    type: "system",
    content: "Ravi joined the playground",
    reactions: {},
    createdAt: iso(-mins(16)),
  },
  {
    id: "msg_04",
    roomId: mockRoom.id,
    senderId: "m_ravi",
    type: "text",
    content: "I vote for a comedy, it's been a long week 😅",
    reactions: {},
    createdAt: iso(-mins(15)),
  },
  {
    id: "msg_05",
    roomId: mockRoom.id,
    senderId: null,
    type: "system",
    content: "Mei joined the playground",
    reactions: {},
    createdAt: iso(-mins(14)),
  },
  {
    id: "msg_06",
    roomId: mockRoom.id,
    senderId: "m_mei",
    type: "emoji",
    content: "🍿🎉😍",
    reactions: { "😍": ["m_anya"] },
    createdAt: iso(-mins(13)),
  },
  {
    id: "msg_07",
    roomId: mockRoom.id,
    senderId: "m_mei",
    type: "text",
    content: "Sharing the snack setup pic from last time:",
    reactions: {},
    createdAt: iso(-mins(12)),
  },
  {
    id: "msg_08",
    roomId: mockRoom.id,
    senderId: "m_mei",
    type: "image",
    content: "https://picsum.photos/seed/hangout-snacks/640/400",
    reactions: { "🔥": ["m_ravi", "m_sam"] },
    createdAt: iso(-mins(12)),
  },
  {
    id: "msg_09",
    roomId: mockRoom.id,
    senderId: null,
    type: "system",
    content: "Leo joined the playground",
    reactions: {},
    createdAt: iso(-mins(10)),
  },
  {
    id: "msg_10",
    roomId: mockRoom.id,
    senderId: "m_ravi",
    type: "text",
    content: "Leo! You still owe us a rematch in tic-tac-toe ⭕❌",
    reactions: {},
    createdAt: iso(-mins(9)),
  },
  {
    id: "msg_11",
    roomId: mockRoom.id,
    senderId: null,
    type: "system",
    content: "Sam joined the playground",
    reactions: {},
    createdAt: iso(-mins(6)),
  },
  {
    id: "msg_12",
    roomId: mockRoom.id,
    senderId: "m_sam",
    type: "text",
    content: "Hey hey! Just voted in the poll — movie night FTW 🍿",
    reactions: {},
    createdAt: iso(-mins(5)),
  },
  {
    id: "msg_13",
    roomId: mockRoom.id,
    senderId: "m_anya",
    type: "image",
    content: "https://picsum.photos/seed/hangout-room/640/400",
    reactions: { "❤️": ["m_mei", "m_sam"], "😍": ["m_ravi"] },
    createdAt: iso(-mins(4)),
  },
  {
    id: "msg_14",
    roomId: mockRoom.id,
    senderId: "m_ravi",
    type: "emoji",
    content: "🎬🍕🎮",
    reactions: {},
    createdAt: iso(-mins(3)),
  },
  {
    id: "msg_15",
    roomId: mockRoom.id,
    senderId: "m_mei",
    type: "text",
    content: "Word guess round 2 is live — I'm stuck on this one 😭",
    reactions: {},
    createdAt: iso(-mins(1)),
  },
];

export const mockPoll: Poll = {
  id: "poll_01",
  roomId: mockRoom.id,
  question: "What should we do first?",
  options: [
    { id: "opt_board", label: "Board games" },
    { id: "opt_movie", label: "Movie night" },
    { id: "opt_karaoke", label: "Karaoke" },
    { id: "opt_chat", label: "Just chatting" },
  ],
  votes: {
    m_anya: "opt_movie",
    m_ravi: "opt_board",
    m_mei: "opt_movie",
    m_sam: "opt_chat",
  },
  createdBy: "m_anya",
  createdAt: iso(-mins(15)),
  closesAt: iso(mins(20)),
  isClosed: false,
};

export const mockTicTacToe: GameSession = {
  id: "game_ttt_01",
  roomId: mockRoom.id,
  type: "tictactoe",
  status: "in-progress",
  players: ["m_anya", "m_ravi"],
  spectators: ["m_mei", "m_sam"],
  scores: { m_anya: 2, m_ravi: 1 },
  state: {
    board: ["X", null, "O", null, "X", null, null, null, null],
    turnMemberId: "m_ravi",
    winnerId: null,
    isDraw: false,
    winningLine: null,
    challenge: null,
  },
  createdAt: iso(-mins(11)),
  updatedAt: iso(-mins(2)),
};

export const mockWordGuess: GameSession = {
  id: "game_wg_01",
  roomId: mockRoom.id,
  type: "wordguess",
  status: "in-progress",
  players: [],
  spectators: [],
  scores: { m_mei: 30, m_anya: 20, m_ravi: 10, m_sam: 0 },
  state: {
    word: "POPCORN",
    revealedIndices: [0, 3],
    hint: "You hear it popping at the movies",
    category: "Snacks",
    round: 2,
    winnerId: null,
    guesses: [
      { memberId: "m_ravi", guess: "PRETZEL", correct: false, at: iso(-mins(4)) },
      { memberId: "m_sam", guess: "POPCORN", correct: true, at: iso(-mins(3)) },
    ],
  },
  createdAt: iso(-mins(8)),
  updatedAt: iso(-mins(3)),
};

export const WORD_LIST: { word: string; hint: string; category: string }[] = [
  { word: "POPCORN", hint: "You hear it popping at the movies", category: "Snacks" },
  { word: "KARAOKE", hint: "Sing your heart out with friends", category: "Party" },
  { word: "PIXEL", hint: "The tiniest piece of a photo", category: "Tech" },
  { word: "HAMMOCK", hint: "Nap station strung between trees", category: "Chill" },
  { word: "FIREWORKS", hint: "They light up the night sky", category: "Celebration" },
];

export const mockThreads: PrivateThread[] = [
  {
    id: "th_anya_ravi",
    roomId: mockRoom.id,
    memberAId: "m_anya",
    memberBId: "m_ravi",
    unreadCount: 1,
    updatedAt: iso(-mins(2)),
  },
  {
    id: "th_mei_sam",
    roomId: mockRoom.id,
    memberAId: "m_mei",
    memberBId: "m_sam",
    unreadCount: 0,
    updatedAt: iso(-mins(7)),
  },
];

export const mockPrivateMessages: PrivateMessage[] = [
  {
    id: "pm_01",
    threadId: "th_anya_ravi",
    senderId: "m_anya",
    content: "Hey! Are you bringing the speaker tonight?",
    createdAt: iso(-mins(5)),
  },
  {
    id: "pm_02",
    threadId: "th_anya_ravi",
    senderId: "m_ravi",
    content: "Yep, charged and ready 🔊",
    createdAt: iso(-mins(2)),
  },
  {
    id: "pm_03",
    threadId: "th_mei_sam",
    senderId: "m_mei",
    content: "Psst — vote for movie night, I already picked the film 👀",
    createdAt: iso(-mins(7)),
  },
];

export const CURRENT_USER_ID = "m_anya";

export function otherMember(
  thread: PrivateThread,
  meId: string,
  members: Member[]
): Member | undefined {
  const otherId = thread.memberAId === meId ? thread.memberBId : thread.memberAId;
  return members.find((m) => m.id === otherId);
}
