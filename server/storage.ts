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
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

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
  deleteMember(id: string): Promise<boolean>;

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
  deleteAnnouncement(id: string): Promise<boolean>;

  // Events
  getEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  deleteEvent(id: string): Promise<boolean>;

  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

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
  deletePoll(id: string): Promise<boolean>;

  // Meeting Rooms
  getMeetingRooms(): Promise<MeetingRoom[]>;
  createMeetingRoom(room: InsertMeetingRoom): Promise<MeetingRoom>;
  deleteMeetingRoom(id: string): Promise<boolean>;
}

// ──────────────────────────────────────────
// SQLite-backed persistent storage
// ──────────────────────────────────────────
// Database path:
//   - Render: /var/data/awg.db (persistent disk mount)
//   - Local:  ./data/awg.db
// Override via env var DB_PATH.

// DB path resolution with robust fallback chain:
//   1. DB_PATH env var (explicit override)
//   2. /var/data/awg.db (Render persistent disk, if writable)
//   3. /tmp/awg.db (Render ephemeral, survives while instance is warm)
//   4. ./data/awg.db (local dev)
function resolveDbPath(): string {
  const explicit = process.env.DB_PATH;
  if (explicit) return explicit;

  const candidates = process.env.RENDER
    ? ["/var/data/awg.db", "/tmp/awg.db"]
    : ["./data/awg.db"];

  for (const p of candidates) {
    const dir = dirname(p);
    try {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      // Probe writability with a test-open
      const probe = new Database(p);
      probe.close();
      return p;
    } catch (err) {
      console.warn(`[storage] Cannot use ${p}: ${(err as Error).message}`);
    }
  }
  // Last-resort: /tmp is almost always writable on Linux
  return "/tmp/awg.db";
}

const DB_PATH = resolveDbPath();

export class SqliteStorage implements IStorage {
  private db: Database.Database;

  constructor() {
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) {
      try { mkdirSync(dir, { recursive: true }); } catch {}
    }

    const persistent = DB_PATH.startsWith("/var/data") || (!DB_PATH.startsWith("/tmp") && !!process.env.DB_PATH);
    console.log(`[storage] Opening SQLite database at: ${DB_PATH} ${persistent ? "(persistent)" : "(ephemeral — data will be lost on restart!)"}`);
    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    this.createTables();
    this.seedIfEmpty();
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL,
        avatar TEXT,
        profileImage TEXT,
        address TEXT,
        website TEXT,
        joinedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        isDefault INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        channelId TEXT NOT NULL,
        memberId TEXT NOT NULL,
        memberName TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL,
        pinned INTEGER DEFAULT 0,
        authorId TEXT NOT NULL,
        authorName TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        time TEXT,
        endTime TEXT,
        location TEXT,
        category TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        assigneeId TEXT,
        assigneeName TEXT,
        dueDate TEXT,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parentId TEXT
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        size TEXT NOT NULL,
        folderId TEXT NOT NULL,
        uploadedBy TEXT NOT NULL,
        uploadedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS polls (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        quorum INTEGER,
        createdBy TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        endsAt TEXT
      );
      CREATE TABLE IF NOT EXISTS pollOptions (
        id TEXT PRIMARY KEY,
        pollId TEXT NOT NULL,
        text TEXT NOT NULL,
        votes INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        pollId TEXT NOT NULL,
        optionId TEXT NOT NULL,
        memberId TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meetingRooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        url TEXT,
        isActive INTEGER DEFAULT 0,
        participants INTEGER DEFAULT 0,
        createdBy TEXT NOT NULL
      );
    `);
  }

  private seedIfEmpty() {
    const count = this.db.prepare("SELECT COUNT(*) as c FROM members").get() as { c: number };
    if (count.c > 0) {
      console.log(`[storage] DB has ${count.c} members — skipping seed`);
      return;
    }

    console.log("[storage] Empty DB — seeding with initial data");

    // Seed with the latest known state from user's manual edits (as of 21.04.2026)
    const initialMembers: Array<Omit<Member, "id">> = [
      { name: "Fredi Orazem", email: "kontakt@fredis-pflegekonzept.de", phone: "01753621549", role: "Gründungsmitglied", avatar: "FO", profileImage: null, address: "Frankenstrasse 50", website: "allengerechteswohnen.de", joinedAt: "2025-01-01" },
      { name: "Markus Stegfellner", email: "stegfellner@fivep.org", phone: "0170 3869086", role: "Unterstützer", avatar: "MS", profileImage: null, address: "Marienstrasse 30, 10117 Berlin", website: "fivep.org", joinedAt: "2025-01-01" },
      { name: "Martina Model", email: "martina-model@gmx.de", phone: null, role: "Gründungsmitglied", avatar: "MM", profileImage: null, address: null, website: null, joinedAt: "2025-02-01" },
      { name: "Rudolf Pfänder", email: "info@rudolf.pfaender.de", phone: "01514143", role: "Unterstützer", avatar: "RP", profileImage: null, address: "Galshofen 17, 91620 Ohrenbach", website: "rudolfpfaender.de", joinedAt: "2025-02-01" },
      { name: "Frank Löffler", email: "info@fl-arch.de", phone: null, role: "Gründungsmitglied", avatar: "FL", profileImage: null, address: null, website: null, joinedAt: "2025-03-01" },
      { name: "Frank Stegmann", email: "stegmannfrank1@gmx.de", phone: null, role: "Unterstützer", avatar: "FS", profileImage: null, address: null, website: null, joinedAt: "2025-03-01" },
      { name: "Dagmar-Judith Kormannshaus-Mathiesen", email: "atmen20189@gmail.com", phone: null, role: "Unterstützer", avatar: "DK", profileImage: null, address: null, website: null, joinedAt: "2025-04-01" },
      { name: "Ute Plaumann", email: "mail@ute-plaumann.de", phone: null, role: "Unterstützer", avatar: "UP", profileImage: null, address: null, website: null, joinedAt: "2025-04-01" },
      { name: "Erwin Taglieber", email: "erwin.taglieber@taglieber.de", phone: null, role: "Unterstützer", avatar: "ET", profileImage: null, address: null, website: null, joinedAt: "2026-04-01" },
    ];

    const insertMember = this.db.prepare(`
      INSERT INTO members (id, name, email, phone, role, avatar, profileImage, address, website, joinedAt)
      VALUES (@id, @name, @email, @phone, @role, @avatar, @profileImage, @address, @website, @joinedAt)
    `);
    initialMembers.forEach((m) => {
      insertMember.run({ id: randomUUID(), ...m });
    });

    // Channels (for chat — not actively used, but seed defaults)
    const channels: Array<Omit<Channel, "id">> = [
      { name: "allgemein", description: "Allgemeine Diskussionen der Genossenschaft", isDefault: true },
      { name: "gründung", description: "Themen rund um die Gründung der eG", isDefault: true },
      { name: "finanzen", description: "Finanzplanung, Anteile und Budget", isDefault: true },
      { name: "bauplanung", description: "Architektur, Grundrisse und Bauprojekte", isDefault: true },
    ];
    const insertChannel = this.db.prepare(`
      INSERT INTO channels (id, name, description, isDefault)
      VALUES (@id, @name, @description, @isDefault)
    `);
    channels.forEach((c) => {
      insertChannel.run({ id: randomUUID(), ...c, isDefault: c.isDefault ? 1 : 0 });
    });

    // Real poll: Namensfindung
    const pollId = randomUUID();
    this.db.prepare(`
      INSERT INTO polls (id, title, description, type, status, quorum, createdBy, createdAt, endsAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pollId,
      "Namensfindung",
      "Abstimmung über den offiziellen Namen der Genossenschaft. Durchgeführt über WhatsApp am 14.04.2026. Ergebnis: AllenGeRechtes Wohnen eG mit 6 Stimmen einstimmig gewählt.",
      "multiple-choice",
      "Beendet",
      5,
      "Fredi Orazem",
      "2026-04-14T09:59:00",
      "2026-04-14T23:59:00"
    );
    this.db.prepare(`
      INSERT INTO pollOptions (id, pollId, text, votes)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), pollId, "AllenGeRechtes Wohnen eG", 6);

    // Meeting Rooms
    const rooms: Array<Omit<MeetingRoom, "id">> = [
      { name: "Vorstandssitzung", description: "Regelmäßiger Raum für Vorstandssitzungen und vertrauliche Besprechungen.", url: "https://meet.ffmuc.net/AWG-Vorstandssitzung", isActive: true, participants: 3, createdBy: "Fredi Orazem" },
      { name: "AG Bauplanung", description: "Offener Raum für die Arbeitsgruppe Bauplanung.", url: "https://meet.ffmuc.net/AWG-AGBauplanung", isActive: false, participants: 0, createdBy: "Frank Löffler" },
    ];
    const insertRoom = this.db.prepare(`
      INSERT INTO meetingRooms (id, name, description, url, isActive, participants, createdBy)
      VALUES (@id, @name, @description, @url, @isActive, @participants, @createdBy)
    `);
    rooms.forEach((r) => {
      insertRoom.run({ id: randomUUID(), ...r, isActive: r.isActive ? 1 : 0 });
    });

    console.log(`[storage] Seeded ${initialMembers.length} members, ${channels.length} channels, 1 poll, ${rooms.length} rooms`);
  }

  // ── Helpers ──
  private boolToInt<T extends Record<string, any>>(obj: T, keys: string[]): T {
    const copy: any = { ...obj };
    keys.forEach((k) => {
      if (k in copy && typeof copy[k] === "boolean") copy[k] = copy[k] ? 1 : 0;
    });
    return copy;
  }

  private intToBool<T extends Record<string, any>>(obj: T | undefined, keys: string[]): T | undefined {
    if (!obj) return obj;
    const copy: any = { ...obj };
    keys.forEach((k) => {
      if (k in copy && (copy[k] === 0 || copy[k] === 1)) copy[k] = copy[k] === 1;
    });
    return copy;
  }

  // ── Users ──
  async getUser(id: string): Promise<User | undefined> {
    return this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.db.prepare("INSERT INTO users (id, username, password) VALUES (?, ?, ?)")
      .run(id, insertUser.username, insertUser.password);
    return user;
  }

  // ── Members ──
  async getMembers(): Promise<Member[]> {
    return this.db.prepare("SELECT * FROM members ORDER BY joinedAt ASC").all() as Member[];
  }
  async getMember(id: string): Promise<Member | undefined> {
    return this.db.prepare("SELECT * FROM members WHERE id = ?").get(id) as Member | undefined;
  }
  async createMember(m: InsertMember): Promise<Member> {
    const id = randomUUID();
    const member: Member = {
      id,
      name: m.name,
      email: m.email,
      phone: m.phone ?? null,
      role: m.role,
      avatar: m.avatar ?? null,
      profileImage: (m as any).profileImage ?? null,
      address: (m as any).address ?? null,
      website: (m as any).website ?? null,
      joinedAt: m.joinedAt ?? null,
    };
    this.db.prepare(`
      INSERT INTO members (id, name, email, phone, role, avatar, profileImage, address, website, joinedAt)
      VALUES (@id, @name, @email, @phone, @role, @avatar, @profileImage, @address, @website, @joinedAt)
    `).run(member);
    return member;
  }
  async updateMember(id: string, data: Partial<Member>): Promise<Member | undefined> {
    const existing = await this.getMember(id);
    if (!existing) return undefined;
    const updated: Member = { ...existing, ...data, id };
    // Recalculate avatar from name if name changed and no explicit avatar
    if (data.name && !data.avatar) {
      updated.avatar = data.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    this.db.prepare(`
      UPDATE members SET
        name = @name, email = @email, phone = @phone, role = @role,
        avatar = @avatar, profileImage = @profileImage, address = @address,
        website = @website, joinedAt = @joinedAt
      WHERE id = @id
    `).run(updated);
    return updated;
  }
  async deleteMember(id: string): Promise<boolean> {
    const result = this.db.prepare("DELETE FROM members WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // ── Channels ──
  async getChannels(): Promise<Channel[]> {
    const rows = this.db.prepare("SELECT * FROM channels").all() as any[];
    return rows.map((r) => this.intToBool(r, ["isDefault"])!) as Channel[];
  }
  async getChannel(id: string): Promise<Channel | undefined> {
    const row = this.db.prepare("SELECT * FROM channels WHERE id = ?").get(id) as any;
    return this.intToBool(row, ["isDefault"]) as Channel | undefined;
  }
  async createChannel(c: InsertChannel): Promise<Channel> {
    const id = randomUUID();
    const channel: Channel = { ...c, id, description: c.description ?? null, isDefault: c.isDefault ?? false };
    this.db.prepare("INSERT INTO channels (id, name, description, isDefault) VALUES (?, ?, ?, ?)")
      .run(id, channel.name, channel.description, channel.isDefault ? 1 : 0);
    return channel;
  }

  // ── Messages ──
  async getMessagesByChannel(channelId: string): Promise<Message[]> {
    return this.db.prepare("SELECT * FROM messages WHERE channelId = ? ORDER BY createdAt ASC").all(channelId) as Message[];
  }
  async createMessage(m: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { ...m, id };
    this.db.prepare(`
      INSERT INTO messages (id, channelId, memberId, memberName, content, createdAt)
      VALUES (@id, @channelId, @memberId, @memberName, @content, @createdAt)
    `).run(message);
    return message;
  }

  // ── Announcements ──
  async getAnnouncements(): Promise<Announcement[]> {
    const rows = this.db.prepare("SELECT * FROM announcements ORDER BY pinned DESC, createdAt DESC").all() as any[];
    return rows.map((r) => this.intToBool(r, ["pinned"])!) as Announcement[];
  }
  async createAnnouncement(a: InsertAnnouncement): Promise<Announcement> {
    const id = randomUUID();
    const ann: Announcement = { ...a, id, pinned: a.pinned ?? false };
    this.db.prepare(`
      INSERT INTO announcements (id, title, content, priority, pinned, authorId, authorName, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, ann.title, ann.content, ann.priority, ann.pinned ? 1 : 0, ann.authorId, ann.authorName, ann.createdAt);
    return ann;
  }
  async updateAnnouncement(id: string, data: Partial<Announcement>): Promise<Announcement | undefined> {
    const rows = this.db.prepare("SELECT * FROM announcements WHERE id = ?").get(id) as any;
    if (!rows) return undefined;
    const existing = this.intToBool(rows, ["pinned"])! as Announcement;
    const updated = { ...existing, ...data };
    this.db.prepare(`
      UPDATE announcements SET title=?, content=?, priority=?, pinned=?, authorId=?, authorName=?, createdAt=?
      WHERE id=?
    `).run(updated.title, updated.content, updated.priority, updated.pinned ? 1 : 0, updated.authorId, updated.authorName, updated.createdAt, id);
    return updated;
  }
  async deleteAnnouncement(id: string): Promise<boolean> {
    return this.db.prepare("DELETE FROM announcements WHERE id = ?").run(id).changes > 0;
  }

  // ── Events ──
  async getEvents(): Promise<Event[]> {
    return this.db.prepare("SELECT * FROM events ORDER BY date ASC").all() as Event[];
  }
  async createEvent(e: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = { ...e, id, description: e.description ?? null, time: e.time ?? null, endTime: e.endTime ?? null, location: e.location ?? null };
    this.db.prepare(`
      INSERT INTO events (id, title, description, date, time, endTime, location, category)
      VALUES (@id, @title, @description, @date, @time, @endTime, @location, @category)
    `).run(event);
    return event;
  }
  async deleteEvent(id: string): Promise<boolean> {
    return this.db.prepare("DELETE FROM events WHERE id = ?").run(id).changes > 0;
  }

  // ── Tasks ──
  async getTasks(): Promise<Task[]> {
    return this.db.prepare("SELECT * FROM tasks ORDER BY createdAt DESC").all() as Task[];
  }
  async createTask(t: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = { ...t, id, description: t.description ?? null, assigneeId: t.assigneeId ?? null, assigneeName: t.assigneeName ?? null, dueDate: t.dueDate ?? null };
    this.db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, assigneeId, assigneeName, dueDate, createdAt)
      VALUES (@id, @title, @description, @status, @priority, @assigneeId, @assigneeName, @dueDate, @createdAt)
    `).run(task);
    return task;
  }
  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const existing = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.db.prepare(`
      UPDATE tasks SET title=?, description=?, status=?, priority=?, assigneeId=?, assigneeName=?, dueDate=?, createdAt=?
      WHERE id=?
    `).run(updated.title, updated.description, updated.status, updated.priority, updated.assigneeId, updated.assigneeName, updated.dueDate, updated.createdAt, id);
    return updated;
  }
  async deleteTask(id: string): Promise<boolean> {
    return this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
  }

  // ── Folders ──
  async getFolders(): Promise<Folder[]> {
    return this.db.prepare("SELECT * FROM folders").all() as Folder[];
  }
  async createFolder(f: InsertFolder): Promise<Folder> {
    const id = randomUUID();
    const folder: Folder = { ...f, id, parentId: f.parentId ?? null };
    this.db.prepare("INSERT INTO folders (id, name, parentId) VALUES (?, ?, ?)")
      .run(id, folder.name, folder.parentId);
    return folder;
  }

  // ── Documents ──
  async getDocuments(): Promise<Document[]> {
    return this.db.prepare("SELECT * FROM documents").all() as Document[];
  }
  async getDocumentsByFolder(folderId: string): Promise<Document[]> {
    return this.db.prepare("SELECT * FROM documents WHERE folderId = ?").all(folderId) as Document[];
  }
  async createDocument(d: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const doc: Document = { ...d, id };
    this.db.prepare(`
      INSERT INTO documents (id, name, type, size, folderId, uploadedBy, uploadedAt)
      VALUES (@id, @name, @type, @size, @folderId, @uploadedBy, @uploadedAt)
    `).run(doc);
    return doc;
  }

  // ── Polls ──
  async getPolls(): Promise<Poll[]> {
    return this.db.prepare("SELECT * FROM polls ORDER BY createdAt DESC").all() as Poll[];
  }
  async createPoll(p: InsertPoll): Promise<Poll> {
    const id = randomUUID();
    const poll: Poll = { ...p, id, description: p.description ?? null, quorum: p.quorum ?? null, endsAt: p.endsAt ?? null };
    this.db.prepare(`
      INSERT INTO polls (id, title, description, type, status, quorum, createdBy, createdAt, endsAt)
      VALUES (@id, @title, @description, @type, @status, @quorum, @createdBy, @createdAt, @endsAt)
    `).run(poll);
    return poll;
  }
  async getPollOptions(pollId: string): Promise<PollOption[]> {
    return this.db.prepare("SELECT * FROM pollOptions WHERE pollId = ?").all(pollId) as PollOption[];
  }
  async createPollOption(o: InsertPollOption): Promise<PollOption> {
    const id = randomUUID();
    const option: PollOption = { ...o, id, votes: o.votes ?? 0 };
    this.db.prepare("INSERT INTO pollOptions (id, pollId, text, votes) VALUES (?, ?, ?, ?)")
      .run(id, option.pollId, option.text, option.votes);
    return option;
  }
  async getVotesByPoll(pollId: string): Promise<Vote[]> {
    return this.db.prepare("SELECT * FROM votes WHERE pollId = ?").all(pollId) as Vote[];
  }
  async createVote(v: InsertVote): Promise<Vote> {
    const id = randomUUID();
    const vote: Vote = { ...v, id };
    this.db.prepare("INSERT INTO votes (id, pollId, optionId, memberId) VALUES (?, ?, ?, ?)")
      .run(id, vote.pollId, vote.optionId, vote.memberId);
    return vote;
  }
  async incrementOptionVotes(optionId: string): Promise<void> {
    this.db.prepare("UPDATE pollOptions SET votes = COALESCE(votes, 0) + 1 WHERE id = ?").run(optionId);
  }
  async deletePoll(id: string): Promise<boolean> {
    this.db.prepare("DELETE FROM pollOptions WHERE pollId = ?").run(id);
    this.db.prepare("DELETE FROM votes WHERE pollId = ?").run(id);
    return this.db.prepare("DELETE FROM polls WHERE id = ?").run(id).changes > 0;
  }

  // ── Meeting Rooms ──
  async getMeetingRooms(): Promise<MeetingRoom[]> {
    const rows = this.db.prepare("SELECT * FROM meetingRooms").all() as any[];
    return rows.map((r) => this.intToBool(r, ["isActive"])!) as MeetingRoom[];
  }
  async createMeetingRoom(r: InsertMeetingRoom): Promise<MeetingRoom> {
    const id = randomUUID();
    const room: MeetingRoom = { ...r, id, description: r.description ?? null, url: r.url ?? null, isActive: r.isActive ?? false, participants: r.participants ?? 0 };
    this.db.prepare(`
      INSERT INTO meetingRooms (id, name, description, url, isActive, participants, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, room.name, room.description, room.url, room.isActive ? 1 : 0, room.participants, room.createdBy);
    return room;
  }
  async deleteMeetingRoom(id: string): Promise<boolean> {
    return this.db.prepare("DELETE FROM meetingRooms WHERE id = ?").run(id).changes > 0;
  }
}

export const storage: IStorage = new SqliteStorage();
