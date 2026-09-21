"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { endLiveSession, leaveLiveRoom, persistMessage, persistReaction, removeLiveMember, renameLiveRoom } from "@/lib/rooms-api";
import { closeLivePoll, createLivePoll, saveGame, voteLivePoll } from "@/lib/games-polls-api";
import { ensureThread, sendLiveDm } from "@/lib/dm-api";
import type {
  GameSession,
  Member,
  Message,
  Poll,
  PrivateMessage,
  PrivateThread,
  Room,
  TicTacToeMark,
} from "@/types";
import {
  CURRENT_USER_ID,
  WORD_LIST,
  mockMembers,
  mockMessages,
  mockPoll,
  mockPrivateMessages,
  mockRoom,
  mockThreads,
  mockTicTacToe,
  mockWordGuess,
} from "@/lib/mock-data";
import { uid } from "@/lib/utils";

interface RoomStore {
  room: Room;
  members: Member[];
  me: Member;
  messages: Message[];
  sendMessage: (content: string, type: Message["type"]) => Promise<boolean>;
  toggleReaction: (messageId: string, emoji: string) => void;
  ingestMessage: (m: Message) => void;
  ingestMembers: (members: Member[]) => void;
  ingestRoom: (room: Room) => void;
  isLive: boolean;
  /** My member id (session identity); false when the host removed me */
  myId: string;
  amRemoved: boolean;
  renameRoom: (name: string) => Promise<boolean>;
  endSession: () => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  leaveRoom: () => Promise<boolean>;
  polls: Poll[];
  vote: (pollId: string, optionId: string) => Promise<boolean>;
  createPoll: (question: string, options: string[]) => Promise<boolean>;
  closePoll: (pollId: string) => Promise<boolean>;
  ingestPolls: (polls: Poll[]) => void;
  upsertGame: (g: GameSession) => void;
  ttt: GameSession;
  playTtt: (index: number) => void;
  rematchTtt: () => void;
  challengePlayer: (toId: string) => void;
  answerChallenge: (accept: boolean) => void;
  word: GameSession;
  guessWord: (guess: string) => boolean | null;
  revealHint: () => void;
  nextWord: () => void;
  threads: PrivateThread[];
  privateMessages: PrivateMessage[];
  openThread: (otherMemberId: string) => Promise<string>;
  sendPrivate: (threadId: string, content: string) => Promise<boolean>;
  markThreadRead: (threadId: string) => void;
  ingestThreads: (threads: PrivateThread[]) => void;
  ingestDm: (m: PrivateMessage) => void;
  bumpUnread: (threadId: string) => void;
  dmFocus: string | null;
  setDmFocus: (threadId: string | null) => void;
  /** Member ids with a live realtime presence (authoritative when live) */
  onlineIds: string[];
  setOnlineIds: (ids: string[]) => void;
  typingNames: string[];
}

const Ctx = createContext<RoomStore | null>(null);

function checkTttWinner(board: TicTacToeMark[]): { winner: TicTacToeMark; line: number[] | null } {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

// Pure transitions (shared by mock + live; live persists the result) --------
function applyTttMove(prev: GameSession, index: number): GameSession {
  if (prev.status !== "in-progress") return prev;
  const s = prev.state as Extract<typeof prev.state, { board: TicTacToeMark[] }>;
  if (s.board[index] || s.winnerId || s.isDraw) return prev;
  const mark: TicTacToeMark = prev.players[0] === s.turnMemberId ? "X" : "O";
  const board = [...s.board];
  board[index] = mark;
  const { winner, line } = checkTttWinner(board);
  const winnerId = winner ? s.turnMemberId : null;
  const isDraw = !winner && board.every(Boolean);
  const nextTurn =
    winnerId || isDraw
      ? s.turnMemberId
      : prev.players.find((p) => p !== s.turnMemberId) ?? s.turnMemberId;
  return {
    ...prev,
    status: winnerId || isDraw ? "finished" : "in-progress",
    scores: winnerId ? { ...prev.scores, [winnerId]: (prev.scores[winnerId] ?? 0) + 1 } : prev.scores,
    state: { ...s, board, turnMemberId: nextTurn, winnerId, isDraw, winningLine: line },
    updatedAt: new Date().toISOString(),
  };
}

function applyTttRematch(prev: GameSession): GameSession {
  let players = prev.players;
  let spectators = prev.spectators;
  if (spectators.length > 0) {
    const next = spectators[0];
    const loser =
      (prev.state as { winnerId: string | null }).winnerId !== prev.players[0]
        ? prev.players[0]
        : prev.players[1];
    players = [prev.players.find((p) => p !== loser) ?? prev.players[0], next].filter(Boolean);
    spectators = [...spectators.slice(1), loser].filter(Boolean);
  }
  return {
    ...prev,
    status: "in-progress",
    players,
    spectators,
    state: {
      board: Array(9).fill(null),
      turnMemberId: players[0],
      winnerId: null,
      isDraw: false,
      winningLine: null,
      challenge: null,
    },
    updatedAt: new Date().toISOString(),
  };
}

function applyWordGuess(prev: GameSession, meId: string, guess: string): { next: GameSession; correct: boolean | null } {
  const g = guess.trim().toUpperCase();
  if (!g) return { next: prev, correct: null };
  if (prev.status !== "in-progress") return { next: prev, correct: null };
  const s = prev.state as Extract<typeof prev.state, { word: string }>;
  if (s.winnerId) return { next: prev, correct: null };
  const isCorrect = g === s.word;
  return {
    next: {
      ...prev,
      status: isCorrect ? "finished" : prev.status,
      scores: isCorrect ? { ...prev.scores, [meId]: (prev.scores[meId] ?? 0) + 10 } : prev.scores,
      state: {
        ...s,
        winnerId: isCorrect ? meId : s.winnerId,
        guesses: [...s.guesses, { memberId: meId, guess: g, correct: isCorrect, at: new Date().toISOString() }],
      },
      updatedAt: new Date().toISOString(),
    },
    correct: isCorrect,
  };
}

function applyWordHint(prev: GameSession): GameSession {
  const s = prev.state as Extract<typeof prev.state, { word: string }>;
  if (s.winnerId || s.revealedIndices.length >= s.word.length) return prev;
  const hidden = s.word.split("").map((_, i) => i).filter((i) => !s.revealedIndices.includes(i));
  const pick = hidden[Math.floor(Math.random() * hidden.length)];
  return { ...prev, state: { ...s, revealedIndices: [...s.revealedIndices, pick] }, updatedAt: new Date().toISOString() };
}

function applyNextWord(prev: GameSession, wordList: { word: string; hint: string; category: string }[]): GameSession {
  const s = prev.state as Extract<typeof prev.state, { round: number }>;
  const next = wordList[s.round % wordList.length];
  return {
    ...prev,
    status: "in-progress",
    state: {
      word: next.word,
      revealedIndices: [0],
      hint: next.hint,
      category: next.category,
      round: s.round + 1,
      winnerId: null,
      guesses: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

export interface LiveSeed {
  room: Room;
  members: Member[];
  messages: Message[];
  polls: Poll[];
  games: GameSession[];
  threads: PrivateThread[];
  dms: PrivateMessage[];
  meId: string;
}

export function RoomProvider({
  children,
  roomOverride,
  seed,
}: {
  children: ReactNode;
  roomOverride?: Partial<Room>;
  seed?: LiveSeed;
}) {
  const live = Boolean(seed) && isSupabaseConfigured;
  const liveRef = useRef(live);
  const [room, setRoom] = useState<Room>(seed?.room ?? { ...mockRoom, ...roomOverride });
  const [members, setMembers] = useState<Member[]>(seed?.members ?? mockMembers);
  const [messages, setMessages] = useState<Message[]>(seed?.messages ?? mockMessages);
  const [polls, setPolls] = useState<Poll[]>(seed?.polls ?? [mockPoll]);
  const [ttt, setTtt] = useState<GameSession>(
    seed?.games.find((g) => g.type === "tictactoe") ?? mockTicTacToe
  );
  const [word, setWord] = useState<GameSession>(
    seed?.games.find((g) => g.type === "wordguess") ?? mockWordGuess
  );
  const [threads, setThreads] = useState<PrivateThread[]>(seed?.threads ?? mockThreads);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>(seed?.dms ?? mockPrivateMessages);
  const [dmFocus, setDmFocus] = useState<string | null>(null);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);

  const me = members.find((m) => m.id === (seed?.meId ?? CURRENT_USER_ID)) ?? members[0];
  const myId = seed?.meId ?? CURRENT_USER_ID;
  const amRemoved = live && members.length > 0 && !members.some((m) => m.id === myId);
  const typingNames = useMemo(() => (live ? [] : ["Mei"]), [live]);
  const meId = seed?.meId ?? CURRENT_USER_ID;

  // Refs mirror latest game/poll state so persist-after-compute stays correct
  const tttRef = useRef(ttt);
  const wordRef = useRef(word);
  const membersRef = useRef(members);
  useEffect(() => {
    tttRef.current = ttt;
    wordRef.current = word;
    membersRef.current = members;
  }, [ttt, word, members]);

  const sendMessage = useCallback(
    async (content: string, type: Message["type"]): Promise<boolean> => {
      if (!content.trim()) return false;
      const msg: Message = {
        id: liveRef.current ? crypto.randomUUID() : uid("msg"),
        roomId: room.id,
        senderId: seed?.meId ?? CURRENT_USER_ID,
        type,
        content: content.trim(),
        reactions: {},
        createdAt: new Date().toISOString(),
      };
      // optimistic local echo (realtime echo dedupes by id via ingestMessage)
      setMessages((prev) => [...prev, msg]);
      if (liveRef.current) {
        try {
          await persistMessage({
            id: msg.id,
            roomId: msg.roomId,
            senderId: msg.senderId,
            type: msg.type,
            content: msg.content,
          });
        } catch (e) {
          console.error("Failed to persist message", e);
          return false;
        }
      }
      return true;
    },
    [room.id, seed?.meId]
  );

  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      let next: Record<string, string[]> | null = null;
      const meId = seed?.meId ?? CURRENT_USER_ID;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const ids = m.reactions[emoji] ?? [];
          const has = ids.includes(meId);
          next = {
            ...m.reactions,
            [emoji]: has ? ids.filter((id) => id !== meId) : [...ids, meId],
          };
          return { ...m, reactions: next };
        })
      );
      if (liveRef.current && next) {
        persistReaction(messageId, next).catch((e) => console.error("Failed to persist reaction", e));
      }
    },
    [seed?.meId]
  );

  /** Upsert by id — realtime echoes of our own optimistic messages dedupe here. */
  const ingestMessage = useCallback((m: Message) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  const ingestMembers = useCallback((next: Member[]) => {
    setMembers(next);
  }, []);

  const ingestRoom = useCallback((r: Room) => {
    setRoom(r);
  }, []);

  const vote = useCallback(
    async (pollId: string, optionId: string): Promise<boolean> => {
      let ok = true;
      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId && !p.isClosed ? { ...p, votes: { ...p.votes, [meId]: optionId } } : p
        )
      );
      if (liveRef.current) {
        try {
          await voteLivePoll(pollId, meId, optionId);
        } catch (e) {
          console.error("Failed to persist vote", e);
          ok = false;
        }
      }
      return ok;
    },
    [meId]
  );

  const createPoll = useCallback(
    async (question: string, options: string[]): Promise<boolean> => {
      if (liveRef.current) {
        try {
          const created = await createLivePoll(room.id, meId, question, options);
          setPolls((prev) => [created, ...prev]);
          return true;
        } catch (e) {
          console.error("Failed to create poll", e);
          return false;
        }
      }
      setPolls((prev) => [
        {
          id: uid("poll"),
          roomId: room.id,
          question: question.trim(),
          options: options.map((label) => ({ id: uid("opt"), label: label.trim() })),
          votes: {},
          createdBy: meId,
          createdAt: new Date().toISOString(),
          closesAt: null,
          isClosed: false,
        },
        ...prev,
      ]);
      return true;
    },
    [room.id, meId]
  );

  const closePoll = useCallback(async (pollId: string): Promise<boolean> => {
    setPolls((prev) => prev.map((p) => (p.id === pollId ? { ...p, isClosed: true } : p)));
    if (liveRef.current) {
      try {
        await closeLivePoll(pollId);
      } catch (e) {
        console.error("Failed to close poll", e);
        return false;
      }
    }
    return true;
  }, []);

  const ingestPolls = useCallback((next: Poll[]) => {
    setPolls(next);
  }, []);

  const upsertGame = useCallback((g: GameSession) => {
    // Ignore our own optimistic echo if the incoming copy is older
    const apply = (prev: GameSession) =>
      prev.id === g.id && new Date(prev.updatedAt).getTime() > new Date(g.updatedAt).getTime() ? prev : g;
    if (g.type === "tictactoe") setTtt(apply);
    else setWord(apply);
  }, []);

  function persistGame(g: GameSession) {
    if (!liveRef.current) return;
    saveGame(g.id, {
      status: g.status,
      players: g.players,
      spectators: g.spectators,
      scores: g.scores,
      state: g.state,
    }).catch((e) => console.error("Failed to persist game", e));
  }

  const playTtt = useCallback((index: number) => {
    const next = applyTttMove(tttRef.current, index);
    if (next === tttRef.current) return;
    setTtt(next);
    persistGame(next);
  }, []);

  const rematchTtt = useCallback(() => {
    const next = applyTttRematch(tttRef.current);
    setTtt(next);
    persistGame(next);
  }, []);

  const challengePlayer = useCallback(
    (toId: string) => {
      const prev = tttRef.current;
      const s = prev.state as Extract<typeof prev.state, { board: TicTacToeMark[] }>;
      const next: GameSession = {
        ...prev,
        state: { ...s, challenge: { fromId: meId, toId } },
        updatedAt: new Date().toISOString(),
      };
      setTtt(next);
      persistGame(next);
    },
    [meId]
  );

  const answerChallenge = useCallback(
    (accept: boolean) => {
      const prev = tttRef.current;
      const s = prev.state as Extract<typeof prev.state, { board: TicTacToeMark[] }>;
      const ch = s.challenge;
      if (!ch) return;
      if (!accept || (ch.fromId !== meId && ch.toId !== meId)) {
        // decline or cancel: just clear the call-out
        const next: GameSession = {
          ...prev,
          state: { ...s, challenge: null },
          updatedAt: new Date().toISOString(),
        };
        setTtt(next);
        persistGame(next);
        return;
      }
      // accept: challenger (X) + acceptor (O), everyone else queues
      const players = [ch.fromId, ch.toId];
      const spectators = [
        ...prev.players.filter((p) => p !== ch.fromId && p !== ch.toId),
        ...prev.spectators.filter((p) => p !== ch.fromId && p !== ch.toId),
      ];
      const next: GameSession = {
        ...prev,
        status: "in-progress",
        players,
        spectators,
        state: {
          board: Array(9).fill(null),
          turnMemberId: ch.fromId,
          winnerId: null,
          isDraw: false,
          winningLine: null,
          challenge: null,
        },
        updatedAt: new Date().toISOString(),
      };
      setTtt(next);
      persistGame(next);
    },
    [meId]
  );

  const guessWord = useCallback(
    (guess: string): boolean | null => {
      const { next, correct } = applyWordGuess(wordRef.current, meId, guess);
      if (next !== wordRef.current) {
        setWord(next);
        persistGame(next);
      }
      return correct;
    },
    [meId]
  );

  const revealHint = useCallback(() => {
    const next = applyWordHint(wordRef.current);
    if (next !== wordRef.current) {
      setWord(next);
      persistGame(next);
    }
  }, []);

  const nextWord = useCallback(() => {
    const next = applyNextWord(wordRef.current, WORD_LIST);
    setWord(next);
    persistGame(next);
  }, []);

  const openThread = useCallback(
    async (otherMemberId: string): Promise<string> => {
      if (liveRef.current) {
        const t = await ensureThread(room.id, meId, otherMemberId);
        setThreads((prev) => (prev.some((x) => x.id === t.id) ? prev : [t, ...prev]));
        return t.id;
      }
      const existing = threads.find(
        (t) =>
          (t.memberAId === meId && t.memberBId === otherMemberId) ||
          (t.memberBId === meId && t.memberAId === otherMemberId)
      );
      if (existing) return existing.id;
      const thread: PrivateThread = {
        id: uid("th"),
        roomId: room.id,
        memberAId: meId,
        memberBId: otherMemberId,
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
      };
      setThreads((prev) => [thread, ...prev]);
      return thread.id;
    },
    [room.id, threads, meId]
  );

  const sendPrivate = useCallback(
    async (threadId: string, content: string): Promise<boolean> => {
      if (!content.trim()) return false;
      if (liveRef.current) {
        try {
          const sent = await sendLiveDm(threadId, meId, content);
          setPrivateMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
          setThreads((prev) =>
            prev.map((t) => (t.id === threadId ? { ...t, updatedAt: sent.createdAt } : t))
          );
          return true;
        } catch (e) {
          console.error("Failed to send DM", e);
          return false;
        }
      }
      setPrivateMessages((prev) => [
        ...prev,
        { id: uid("pm"), threadId, senderId: meId, content: content.trim(), createdAt: new Date().toISOString() },
      ]);
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, updatedAt: new Date().toISOString() } : t)));
      return true;
    },
    [meId]
  );

  const markThreadRead = useCallback((threadId: string) => {
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)));
  }, []);

  /** Merge refetched threads, preserving local unread badges. */
  const ingestThreads = useCallback((next: PrivateThread[]) => {
    setThreads((prev) => {
      const unread = new Map(prev.map((t) => [t.id, t.unreadCount]));
      return next.map((t) => ({ ...t, unreadCount: unread.get(t.id) ?? 0 }));
    });
  }, []);

  const ingestDm = useCallback((m: PrivateMessage) => {
    setPrivateMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    setThreads((prev) => prev.map((t) => (t.id === m.threadId ? { ...t, updatedAt: m.createdAt } : t)));
  }, []);

  const bumpUnread = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unreadCount: t.unreadCount + 1 } : t))
    );
  }, []);

  const renameRoom = useCallback(
    async (name: string): Promise<boolean> => {
      const clean = name.trim().slice(0, 48);
      if (!clean) return false;
      setRoom((prev) => ({ ...prev, name: clean }));
      if (liveRef.current) {
        try {
          await renameLiveRoom(room.id, clean);
        } catch (e) {
          console.error("Failed to rename room", e);
          return false;
        }
      }
      return true;
    },
    [room.id]
  );

  const endSession = useCallback(async (): Promise<boolean> => {
    setRoom((prev) => ({ ...prev, expiresAt: new Date().toISOString() }));
    if (liveRef.current) {
      try {
        await endLiveSession(room.id);
      } catch (e) {
        console.error("Failed to end session", e);
        return false;
      }
    }
    return true;
  }, [room.id]);

  const removeMember = useCallback(
    async (memberId: string): Promise<boolean> => {
      const leaver = membersRef.current.find((m) => m.id === memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setMessages((prev) => [
        ...prev,
        {
          id: liveRef.current ? crypto.randomUUID() : uid("msg"),
          roomId: room.id,
          senderId: null,
          type: "system",
          content: `${leaver?.displayName ?? "Someone"} was removed by the host`,
          reactions: {},
          createdAt: new Date().toISOString(),
        },
      ]);
      if (liveRef.current) {
        try {
          await removeLiveMember(memberId);
        } catch (e) {
          console.error("Failed to remove member", e);
          return false;
        }
      }
      return true;
    },
    [room.id]
  );

  const leaveRoom = useCallback(async (): Promise<boolean> => {
    if (liveRef.current) {
      try {
        await leaveLiveRoom(room.id, meId);
        return true;
      } catch (e) {
        console.error("Failed to leave room", e);
        return false;
      }
    }
    // Mock: drop self locally + system note
    const leaver = membersRef.current.find((m) => m.id === meId);
    setMembers((prev) => prev.filter((m) => m.id !== meId));
    setMessages((prev) => [
      ...prev,
      {
        id: uid("msg"),
        roomId: room.id,
        senderId: null,
        type: "system",
        content: `${leaver?.displayName ?? "Someone"} left the playground`,
        reactions: {},
        createdAt: new Date().toISOString(),
      },
    ]);
    return true;
  }, [room.id, meId]);

  const value = useMemo<RoomStore>(
    () => ({
      room, members, me, messages, sendMessage, toggleReaction, ingestMessage, ingestMembers, ingestRoom,
      isLive: live, myId, amRemoved, renameRoom, endSession, removeMember, leaveRoom,
      polls, vote, createPoll, closePoll, ingestPolls, upsertGame,
      ttt, playTtt, rematchTtt, challengePlayer, answerChallenge, word, guessWord, revealHint, nextWord,
      threads, privateMessages, openThread, sendPrivate, markThreadRead, ingestThreads, ingestDm, bumpUnread, dmFocus, setDmFocus, onlineIds, setOnlineIds, typingNames,
    }),
    [room, members, me, messages, sendMessage, toggleReaction, ingestMessage, ingestMembers, ingestRoom, live, myId, amRemoved, renameRoom, endSession, removeMember, leaveRoom, polls, vote, createPoll, closePoll, ingestPolls, upsertGame, ttt, playTtt, rematchTtt, challengePlayer, answerChallenge, word, guessWord, revealHint, nextWord, threads, privateMessages, openThread, sendPrivate, markThreadRead, ingestThreads, ingestDm, bumpUnread, dmFocus, onlineIds, setOnlineIds, typingNames]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRoom() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRoom must be used within RoomProvider");
  return ctx;
}
