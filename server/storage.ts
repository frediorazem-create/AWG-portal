import {
  type User, type InsertUser,
  type Member, type InsertMember,
  type Channel, type InsertChannel,
  type Message, type InsertMessage,
  type Announcement, type InsertAnnouncement,
  type Event, type InsertEvent,
  type Task, type InsertTask,
  type Folder, type InsertFolder,
  type Document, type InsertDocument,
  type Poll, type InsertPoll,
  type PollOption, type InsertPollOption,
  type Vote, type InsertVote,
  type MeetingRoom, type InsertMeetingRoom,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Members
  getMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, data: Partial<Member>): Promise<Member | undefined>;

  // Channels
  getChannels(): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;

  // Messages
  getMessagesByChannel(channelId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Announcements
  getAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, data: Partial<Announcement>): Promise<Announcement | undefined>;

  // Events
  getEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;

  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;

  // Folders
  getFolders(): Promise<Folder[]>;
  createFolder(folder: InsertFolder): Promise<Folder>;

  // Documents
  getDocuments(): Promise<Document[]>;
  getDocumentsByFolder(folderId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;

  // Polls
  getPolls(): Promise<Poll[]>;
  createPoll(poll: InsertPoll): Promise<Poll>;
  getPollOptions(pollId: string): Promise<PollOption[]>;
  createPollOption(option: InsertPollOption): Promise<PollOption>;
  getVotesByPoll(pollId: string): Promise<Vote[]>;
  createVote(vote: InsertVote): Promise<Vote>;
  incrementOptionVotes(optionId: string): Promise<void>;

  // Meeting Rooms
  getMeetingRooms(): Promise<MeetingRoom[]>;
  createMeetingRoom(room: InsertMeetingRoom): Promise<MeetingRoom>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private members: Map<string, Member>;
  private channels: Map<string, Channel>;
  private messages: Map<string, Message>;
  private announcements: Map<string, Announcement>;
  private events: Map<string, Event>;
  private tasks: Map<string, Task>;
  private folders: Map<string, Folder>;
  private documents: Map<string, Document>;
  private polls: Map<string, Poll>;
  private pollOptions: Map<string, PollOption>;
  private votes: Map<string, Vote>;
  private meetingRooms: Map<string, MeetingRoom>;

  constructor() {
    this.users = new Map();
    this.members = new Map();
    this.channels = new Map();
    this.messages = new Map();
    this.announcements = new Map();
    this.events = new Map();
    this.tasks = new Map();
    this.folders = new Map();
    this.documents = new Map();
    this.polls = new Map();
    this.pollOptions = new Map();
    this.votes = new Map();
    this.meetingRooms = new Map();
    this.seed();
  }

  private seed() {
    // ── Members ──
    const memberData: InsertMember[] = [
      { name: "Fredi Orazem", email: "fredi.orazem@gmx.de", phone: null, role: "Vorstand", avatar: "FO", joinedAt: "2025-01-01" },
      { name: "Markus Stegfellner", email: "markus.stegfellner@awg.de", phone: null, role: "Vorstand", avatar: "MS", joinedAt: "2025-01-01" },
      { name: "Martina Model", email: "martina.model@awg.de", phone: null, role: "Gründungsmitglied", avatar: "MM", joinedAt: "2025-02-01" },
      { name: "Rudolf Pfänder", email: "rudolf.pfaender@awg.de", phone: null, role: "Gründungsmitglied", avatar: "RP", joinedAt: "2025-02-01" },
      { name: "Frank Löffler", email: "frank.loeffler@awg.de", phone: null, role: "Gründungsmitglied", avatar: "FL", joinedAt: "2025-03-01" },
      { name: "Frank Stegmann", email: "frank.stegmann@awg.de", phone: null, role: "Gründungsmitglied", avatar: "FS", joinedAt: "2025-03-01" },
      { name: "Dagmar-Judith Kormannshaus-Mathiesen", email: "dagmar.kormannshaus@awg.de", phone: null, role: "Gründungsmitglied", avatar: "DK", joinedAt: "2025-04-01" },
      { name: "Ute Blaumann", email: "ute.blaumann@awg.de", phone: null, role: "Gründungsmitglied", avatar: "UB", joinedAt: "2025-04-01" },
    ];

    const memberIds: string[] = [];
    memberData.forEach((m) => {
      const id = randomUUID();
      memberIds.push(id);
      this.members.set(id, { ...m, id });
    });

    // ── Channels ──
    const channelData: InsertChannel[] = [
      { name: "allgemein", description: "Allgemeine Diskussionen der Genossenschaft", isDefault: true },
      { name: "gründung", description: "Themen rund um die Gründung der eG", isDefault: true },
      { name: "finanzen", description: "Finanzplanung, Anteile und Budget", isDefault: true },
      { name: "bauplanung", description: "Architektur, Grundrisse und Bauprojekte", isDefault: true },
    ];
    const channelIds: string[] = [];
    channelData.forEach((c) => {
      const id = randomUUID();
      channelIds.push(id);
      this.channels.set(id, { ...c, id });
    });

    // ── Messages (leer – echte Nachrichten werden über den Chat erstellt) ──

    // ── Announcements (leer – echte Ankündigungen werden über die App erstellt) ──
    const annData: InsertAnnouncement[] = [];
    annData.forEach((a) => {
      const id = randomUUID();
      this.announcements.set(id, { ...a, id });
    });

    // ── Events (leer – echte Termine werden über den Kalender erstellt) ──

    // ── Tasks (leer – echte Aufgaben werden über das Kanban-Board erstellt) ──

    // ── Folders & Documents (leer – echte Dokumente werden über die App hochgeladen) ──

    // ── Polls ──

    // Echte Abstimmung: Namensfindung (über WhatsApp durchgeführt am 14.04.2026)
    const poll1Id = randomUUID();
    this.polls.set(poll1Id, {
      id: poll1Id,
      title: "Namensfindung",
      description: "Abstimmung über den offiziellen Namen der Genossenschaft. Durchgeführt über WhatsApp am 14.04.2026. Ergebnis: AllenGeRechtes Wohnen eG mit 6 Stimmen einstimmig gewählt.",
      type: "multiple-choice",
      status: "Beendet",
      quorum: 5,
      createdBy: "Fredi Orazem",
      createdAt: "2026-04-14T09:59:00",
      endsAt: "2026-04-14T23:59:00",
    });
    const p1Opts = [
      { text: "AllenGeRechtes Wohnen eG", votes: 6 },
    ];
    p1Opts.forEach((o) => {
      const oid = randomUUID();
      this.pollOptions.set(oid, { id: oid, pollId: poll1Id, text: o.text, votes: o.votes });
    });

    // ── Meeting Rooms ──
    const roomData: InsertMeetingRoom[] = [
      { name: "Vorstandssitzung", description: "Regelmäßiger Raum für Vorstandssitzungen und vertrauliche Besprechungen.", url: "https://meet.jit.si/AWG-Vorstandssitzung", isActive: true, participants: 3, createdBy: "Fredi Orazem" },
      { name: "AG Bauplanung", description: "Offener Raum für die Arbeitsgruppe Bauplanung.", url: "https://meet.jit.si/AWG-AGBauplanung", isActive: false, participants: 0, createdBy: "Frank Löffler" },
    ];
    roomData.forEach((r) => {
      const id = randomUUID();
      this.meetingRooms.set(id, { ...r, id });
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Members
  async getMembers(): Promise<Member[]> {
    return Array.from(this.members.values());
  }
  async getMember(id: string): Promise<Member | undefined> {
    return this.members.get(id);
  }
  async createMember(m: InsertMember): Promise<Member> {
    const id = randomUUID();
    const member: Member = { ...m, id };
    this.members.set(id, member);
    return member;
  }
  async updateMember(id: string, data: Partial<Member>): Promise<Member | undefined> {
    const existing = this.members.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id };
    // Recalculate avatar from name if name changed
    if (data.name && !data.avatar) {
      updated.avatar = data.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    this.members.set(id, updated);
    return updated;
  }

  // Channels
  async getChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }
  async getChannel(id: string): Promise<Channel | undefined> {
    return this.channels.get(id);
  }
  async createChannel(c: InsertChannel): Promise<Channel> {
    const id = randomUUID();
    const channel: Channel = { ...c, id };
    this.channels.set(id, channel);
    return channel;
  }

  // Messages
  async getMessagesByChannel(channelId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.channelId === channelId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async createMessage(m: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { ...m, id };
    this.messages.set(id, message);
    return message;
  }

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    return Array.from(this.announcements.values()).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }
  async createAnnouncement(a: InsertAnnouncement): Promise<Announcement> {
    const id = randomUUID();
    const announcement: Announcement = { ...a, id };
    this.announcements.set(id, announcement);
    return announcement;
  }
  async updateAnnouncement(id: string, data: Partial<Announcement>): Promise<Announcement | undefined> {
    const existing = this.announcements.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.announcements.set(id, updated);
    return updated;
  }

  // Events
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  async createEvent(e: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = { ...e, id };
    this.events.set(id, event);
    return event;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }
  async createTask(t: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = { ...t, id };
    this.tasks.set(id, task);
    return task;
  }
  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.tasks.set(id, updated);
    return updated;
  }

  // Folders
  async getFolders(): Promise<Folder[]> {
    return Array.from(this.folders.values());
  }
  async createFolder(f: InsertFolder): Promise<Folder> {
    const id = randomUUID();
    const folder: Folder = { ...f, id };
    this.folders.set(id, folder);
    return folder;
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }
  async getDocumentsByFolder(folderId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter((d) => d.folderId === folderId);
  }
  async createDocument(d: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const doc: Document = { ...d, id };
    this.documents.set(id, doc);
    return doc;
  }

  // Polls
  async getPolls(): Promise<Poll[]> {
    return Array.from(this.polls.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async createPoll(p: InsertPoll): Promise<Poll> {
    const id = randomUUID();
    const poll: Poll = { ...p, id };
    this.polls.set(id, poll);
    return poll;
  }
  async getPollOptions(pollId: string): Promise<PollOption[]> {
    return Array.from(this.pollOptions.values()).filter((o) => o.pollId === pollId);
  }
  async createPollOption(o: InsertPollOption): Promise<PollOption> {
    const id = randomUUID();
    const option: PollOption = { ...o, id };
    this.pollOptions.set(id, option);
    return option;
  }
  async getVotesByPoll(pollId: string): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter((v) => v.pollId === pollId);
  }
  async createVote(v: InsertVote): Promise<Vote> {
    const id = randomUUID();
    const vote: Vote = { ...v, id };
    this.votes.set(id, vote);
    return vote;
  }
  async incrementOptionVotes(optionId: string): Promise<void> {
    const option = this.pollOptions.get(optionId);
    if (option) {
      option.votes = (option.votes || 0) + 1;
      this.pollOptions.set(optionId, option);
    }
  }

  // Meeting Rooms
  async getMeetingRooms(): Promise<MeetingRoom[]> {
    return Array.from(this.meetingRooms.values());
  }
  async createMeetingRoom(r: InsertMeetingRoom): Promise<MeetingRoom> {
    const id = randomUUID();
    const room: MeetingRoom = { ...r, id };
    this.meetingRooms.set(id, room);
    return room;
  }
}

export const storage = new MemStorage();
