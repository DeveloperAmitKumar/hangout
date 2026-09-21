export interface Room {
  id: string;
  name: string;
  hostId: string;
  sessionDurationMinutes: number;
  createdAt: string; // ISO
  expiresAt: string; // ISO
  inviteToken: string;
  inviteLink: string;
  visibility: "private" | "public";
  hasPassword: boolean;
}

export interface Member {
  id: string;
  roomId: string;
  displayName: string;
  avatarUrl: string;
  isHost: boolean;
  isOnline: boolean;
  joinedAt: string; // ISO
}

export type MessageType = "text" | "emoji" | "image" | "system";

export interface Message {
  id: string;
  roomId: string;
  senderId: string | null; // null for system messages
  type: MessageType;
  content: string; // text body, emoji chars, image URL/object URL, or system text
  reactions: Record<string, string[]>; // emoji -> memberIds
  createdAt: string; // ISO
}

export interface PrivateThread {
  id: string;
  roomId: string;
  memberAId: string;
  memberBId: string;
  unreadCount: number;
  updatedAt: string; // ISO
}

export interface PrivateMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string; // ISO
}

export type GameType = "tictactoe" | "wordguess";

export type TicTacToeMark = "X" | "O" | null;

export interface TicTacToeState {
  board: TicTacToeMark[]; // length 9
  turnMemberId: string;
  winnerId: string | null;
  isDraw: boolean;
  winningLine: number[] | null;
  /** Pending call-out: fromId challenged toId to a match */
  challenge: { fromId: string; toId: string } | null;
}

export interface WordGuessState {
  word: string;
  revealedIndices: number[];
  hint: string;
  category: string;
  round: number;
  guessesLeft?: number;
  winnerId: string | null;
  guesses: { memberId: string; guess: string; correct: boolean; at: string }[];
}

export interface GameSession {
  id: string;
  roomId: string;
  type: GameType;
  status: "in-progress" | "finished";
  players: string[]; // memberIds
  spectators: string[]; // memberIds (tictactoe queue)
  scores: Record<string, number>; // memberId -> points
  state: TicTacToeState | WordGuessState;
  createdAt: string;
  updatedAt: string;
}

export interface PollOption {
  id: string;
  label: string;
}

export interface Poll {
  id: string;
  roomId: string;
  question: string;
  options: PollOption[];
  votes: Record<string, string>; // memberId -> optionId (single-choice)
  createdBy: string;
  createdAt: string;
  closesAt: string | null;
  isClosed: boolean;
}

export type RoomTab = "chat" | "games" | "polls" | "members";
