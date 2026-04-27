import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users (for auth / current user context)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Members (cooperative members directory)
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").notNull(), // Vorstand, Aufsichtsrat, Gründungsmitglied, Mitglied, Interessent, Unterstützer
  avatar: text("avatar"), // initials
  profileImage: text("profile_image"), // base64 data URL for profile photo
  address: text("address"), // street, city, zip
  website: text("website"), // personal or company website URL
  joinedAt: text("joined_at"),
  passwordHash: text("password_hash"), // bcrypt-Hash des Passworts (null = kein Login möglich)
  isAdmin: boolean("is_admin").default(false),
});

export const insertMemberSchema = createInsertSchema(members).omit({ id: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

// Channels
export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
});

export const insertChannelSchema = createInsertSchema(channels).omit({ id: true });
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull(),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Announcements
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull(), // Normal, Wichtig, Dringend
  pinned: boolean("pinned").default(false),
  authorId: varchar("author_id").notNull(),
  authorName: text("author_name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true });
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// Events
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // ISO date string
  time: text("time"),
  endTime: text("end_time"),
  location: text("location"),
  category: text("category").notNull(), // Workshop, Versammlung, Treffen, Sonstiges
});

export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull(), // Offen, In Bearbeitung, Erledigt
  priority: text("priority").notNull(), // Niedrig, Mittel, Hoch
  assigneeId: varchar("assignee_id"),
  assigneeName: text("assignee_name"),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Folders
export const folders = pgTable("folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  parentId: varchar("parent_id"),
});

export const insertFolderSchema = createInsertSchema(folders).omit({ id: true });
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof folders.$inferSelect;

// Documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // pdf, docx, xlsx, md, etc.
  size: text("size").notNull(), // human-readable size
  folderId: varchar("folder_id").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  content: text("content"),       // Markdown content (for native md docs)
  notionUrl: text("notion_url"),  // Original Notion source URL
  mimeType: text("mime_type"),    // MIME-Typ der hochgeladenen Datei
  fileData: text("file_data"),    // Base64-kodierter Datei-Inhalt
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Polls
export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // ja-nein, multiple-choice, ranked
  status: text("status").notNull(), // Aktiv, Beendet
  quorum: integer("quorum"), // minimum votes required
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  endsAt: text("ends_at"),
});

export const insertPollSchema = createInsertSchema(polls).omit({ id: true });
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Poll = typeof polls.$inferSelect;

// Poll Options
export const pollOptions = pgTable("poll_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull(),
  text: text("text").notNull(),
  votes: integer("votes").default(0),
});

export const insertPollOptionSchema = createInsertSchema(pollOptions).omit({ id: true });
export type InsertPollOption = z.infer<typeof insertPollOptionSchema>;
export type PollOption = typeof pollOptions.$inferSelect;

// Votes
export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull(),
  optionId: varchar("option_id").notNull(),
  memberId: varchar("member_id").notNull(),
});

export const insertVoteSchema = createInsertSchema(votes).omit({ id: true });
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;

// Meeting Rooms
export const meetingRooms = pgTable("meeting_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  url: text("url"), // External BBB URL
  isActive: boolean("is_active").default(false),
  participants: integer("participants").default(0),
  createdBy: text("created_by").notNull(),
});

export const insertMeetingRoomSchema = createInsertSchema(meetingRooms).omit({ id: true });
export type InsertMeetingRoom = z.infer<typeof insertMeetingRoomSchema>;
export type MeetingRoom = typeof meetingRooms.$inferSelect;

// Eigene Sidebar-Bereiche (vom Nutzer angelegt)
export const sidebarItems = pgTable("sidebar_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  description: text("description"),
  content: text("content"),       // Markdown-Inhalt (optional)
  url: text("url"),               // Externer Link (optional)
  sortOrder: integer("sort_order").default(0),
});

export const insertSidebarItemSchema = createInsertSchema(sidebarItems).omit({ id: true });
export type InsertSidebarItem = z.infer<typeof insertSidebarItemSchema>;
export type SidebarItem = typeof sidebarItems.$inferSelect;
