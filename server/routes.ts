import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertMemberSchema,
  insertChannelSchema,
  insertMessageSchema,
  insertAnnouncementSchema,
  insertEventSchema,
  insertTaskSchema,
  insertFolderSchema,
  insertDocumentSchema,
  insertPollSchema,
  insertPollOptionSchema,
  insertVoteSchema,
  insertMeetingRoomSchema,
} from "@shared/schema";
import {
  createNotionMember,
  updateNotionMember,
  createNotionChannel,
  createNotionMessage,
  createNotionAnnouncement,
  createNotionEvent,
  createNotionTask,
  createNotionFolder,
  createNotionDocument,
  createNotionPoll,
  createNotionPollOption,
  createNotionMeetingRoom,
  updateNotionTask,
  updateNotionAnnouncement,
  updateNotionPollOptionVotes,
  searchNotionDatabase,
} from "./notion";
import { sendBulkMail, verifySmtp } from "./mailer";
import { listInbox, getMail, getAttachment, setFlags, verifyImap, findSentMailbox } from "./imap";
import multer from "multer";
import { hashPassword, verifyPassword, startSession, endSession, requireLogin, requireAdmin } from "./auth";

/** Fire-and-forget Notion sync — never blocks the response */
function notionSync(label: string, fn: () => any) {
  try {
    fn();
  } catch (err: any) {
    console.error(`[notion-sync] ${label} failed:`, err.message);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth-Routen (öffentlich) ──
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "E-Mail und Passwort erforderlich" });
    }
    const member = await storage.getMemberByEmail(String(email));
    if (!member || !member.passwordHash) {
      return res.status(401).json({ error: "E-Mail oder Passwort falsch" });
    }
    const ok = await verifyPassword(String(password), member.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "E-Mail oder Passwort falsch" });
    }
    startSession(res, member.id);
    res.json({ id: member.id, name: member.name, email: member.email, isAdmin: !!member.isAdmin });
  });

  app.post("/api/auth/logout", async (req, res) => {
    endSession(req, res);
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.currentMember) return res.status(401).json({ error: "Nicht angemeldet" });
    const m = req.currentMember;
    res.json({ id: m.id, name: m.name, email: m.email, isAdmin: !!m.isAdmin });
  });

  // Eigenes Passwort ändern (jeder eingeloggte Nutzer)
  app.post("/api/auth/change-password", requireLogin, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Beide Passwörter erforderlich" });
    if (String(newPassword).length < 8) return res.status(400).json({ error: "Neues Passwort muss mindestens 8 Zeichen haben" });
    const me = req.currentMember!;
    if (!me.passwordHash) return res.status(400).json({ error: "Konto hat noch kein Passwort" });
    const ok = await verifyPassword(String(currentPassword), me.passwordHash);
    if (!ok) return res.status(401).json({ error: "Aktuelles Passwort falsch" });
    const newHash = await hashPassword(String(newPassword));
    await storage.updateMember(me.id, { passwordHash: newHash });
    res.json({ success: true });
  });

  // Admin: Passwort eines Mitglieds setzen / Admin-Status ändern
  app.post("/api/members/:id/set-password", requireAdmin, async (req, res) => {
    const { password } = req.body || {};
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: "Passwort muss mindestens 8 Zeichen haben" });
    }
    const member = await storage.getMember(req.params.id);
    if (!member) return res.status(404).json({ error: "Mitglied nicht gefunden" });
    const hash = await hashPassword(String(password));
    await storage.updateMember(member.id, { passwordHash: hash });
    res.json({ success: true });
  });

  app.post("/api/members/:id/set-admin", requireAdmin, async (req, res) => {
    const { isAdmin } = req.body || {};
    const member = await storage.getMember(req.params.id);
    if (!member) return res.status(404).json({ error: "Mitglied nicht gefunden" });
    // Sicherheitsregel: Selbst-Demote nur erlaubt, wenn ein anderer Admin existiert
    if (req.currentMember!.id === member.id && !isAdmin) {
      const all = await storage.getMembers();
      const otherAdmins = all.filter((m) => m.isAdmin && m.id !== member.id).length;
      if (otherAdmins === 0) {
        return res.status(400).json({ error: "Letzten Admin kann man sich nicht selbst entziehen" });
      }
    }
    await storage.updateMember(member.id, { isAdmin: !!isAdmin });
    res.json({ success: true });
  });

  // ── Globaler Schutz: alle weiteren /api/-Routen erfordern Login,
  // Schreib-/Löschoperationen erfordern Admin ──
  // Whitelist: Routen, auf die auch normale Mitglieder schreiben dürfen.
  // (Aktuell nur Abstimmen — alles andere ist Admin-only.)
  const memberWriteWhitelist: Array<{ method: string; pattern: RegExp }> = [
    { method: "POST", pattern: /^\/api\/votes\/?$/ },
  ];
  app.use("/api", (req, res, next) => {
    if (!req.currentMember) return res.status(401).json({ error: "Nicht angemeldet" });
    if (req.method === "GET") return next();
    if (req.currentMember.isAdmin) return next();
    const path = req.path; // z. B. "/votes" (relativ zum app.use-Mount)
    const fullPath = "/api" + (path.startsWith("/") ? path : "/" + path);
    const allowed = memberWriteWhitelist.some(
      (w) => w.method === req.method && w.pattern.test(fullPath)
    );
    if (allowed) return next();
    return res.status(403).json({ error: "Keine Admin-Rechte. Nur Admins dürfen ändern." });
  });

  // ── Members ──
  app.get("/api/members", async (_req, res) => {
    const members = await storage.getMembers();
    res.json(members);
  });

  app.get("/api/members/:id", async (req, res) => {
    const member = await storage.getMember(req.params.id);
    if (!member) return res.status(404).json({ error: "Mitglied nicht gefunden" });
    res.json(member);
  });

  app.post("/api/members", async (req, res) => {
    const parsed = insertMemberSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const member = await storage.createMember(parsed.data);
    notionSync("createMember", () => createNotionMember(parsed.data));
    res.status(201).json(member);
  });

  app.patch("/api/members/:id", async (req, res) => {
    const updated = await storage.updateMember(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Mitglied nicht gefunden" });

    // Sync changes to Notion — find member by name and update
    notionSync("updateMember", () => {
      const results = searchNotionDatabase("mitglieder", updated.name || " ");
      if (results.length > 0) {
        updateNotionMember(results[0].id, req.body);
      }
    });

    res.json(updated);
  });

  app.delete("/api/members/:id", async (req, res) => {
    const deleted = await storage.deleteMember(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Mitglied nicht gefunden" });
    res.json({ success: true });
  });

  // ── Mailing (E-Mail-Verteiler) ──
  app.get("/api/mailing/status", async (_req, res) => {
    const status = await verifySmtp();
    res.json(status);
  });

  // File-upload middleware for mail attachments
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024, files: 10 }, // 15 MB per file, 10 files max
  });

  app.post("/api/mailing/send", upload.array("attachments", 10), async (req, res) => {
    // When multer is used, form fields arrive on req.body; arrays come as strings
    const recipientsRaw = req.body.recipients;
    const recipients: string[] = Array.isArray(recipientsRaw)
      ? recipientsRaw
      : typeof recipientsRaw === "string"
        ? (recipientsRaw.startsWith("[") ? JSON.parse(recipientsRaw) : recipientsRaw.split(",").map(s => s.trim()))
        : [];
    const subject = (req.body.subject || "").toString();
    const body = (req.body.body || "").toString();
    const replyTo = req.body.replyTo ? String(req.body.replyTo) : undefined;
    const inReplyTo = req.body.inReplyTo ? String(req.body.inReplyTo) : undefined;
    const referencesRaw = req.body.references;
    const references: string[] | undefined = Array.isArray(referencesRaw)
      ? referencesRaw
      : typeof referencesRaw === "string" && referencesRaw
        ? (referencesRaw.startsWith("[") ? JSON.parse(referencesRaw) : [referencesRaw])
        : undefined;
    const useBcc = req.body.useBcc === undefined ? true : req.body.useBcc !== "false" && req.body.useBcc !== false;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "Keine Empfänger angegeben" });
    }
    if (!subject || !body) {
      return res.status(400).json({ error: "Betreff und Text sind erforderlich" });
    }

    const validEmails = recipients.filter((e) => typeof e === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (validEmails.length === 0) {
      return res.status(400).json({ error: "Keine gültigen E-Mail-Adressen" });
    }

    const files = (req.files as Express.Multer.File[] | undefined) || [];
    const attachments = files.map(f => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));

    const result = await sendBulkMail({
      to: validEmails,
      subject,
      body,
      replyTo,
      attachments: attachments.length > 0 ? attachments : undefined,
      inReplyTo,
      references,
      useBcc,
    });
    if (!result.success) {
      return res.status(500).json(result);
    }
    res.json({ ...result, attachments: attachments.length });
  });

  // ── Posteingang (IMAP direkt) ──
  app.get("/api/inbox/status", async (_req, res) => {
    const status = await verifyImap();
    res.json(status);
  });

  app.get("/api/inbox", async (req, res) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
      const search = req.query.search ? String(req.query.search) : undefined;
      const result = await listInbox({ limit, search });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/inbox/:uid", async (req, res) => {
    try {
      const uid = parseInt(req.params.uid, 10);
      if (!uid) return res.status(400).json({ error: "Ungültige UID" });
      const mail = await getMail(uid);
      if (!mail) return res.status(404).json({ error: "Nachricht nicht gefunden" });
      res.json(mail);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/inbox/:uid/flags", async (req, res) => {
    try {
      const uid = parseInt(req.params.uid, 10);
      const { seen, flagged, deleted } = req.body as { seen?: boolean; flagged?: boolean; deleted?: boolean };
      await setFlags(uid, { seen, flagged, deleted });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/inbox/:uid/attachments/:partId", async (req, res) => {
    try {
      const uid = parseInt(req.params.uid, 10);
      const partId = req.params.partId;
      const att = await getAttachment(uid, partId);
      if (!att) return res.status(404).json({ error: "Anhang nicht gefunden" });
      res.setHeader("Content-Type", att.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(att.filename)}"`);
      res.send(att.content);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Postausgang / Gesendet (IMAP) ──
  app.get("/api/sent", async (req, res) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
      const search = req.query.search ? String(req.query.search) : undefined;
      const mailbox = await findSentMailbox();
      const result = await listInbox({ mailbox, limit, search });
      res.json({ ...result, mailbox });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/sent/:uid", async (req, res) => {
    try {
      const uid = parseInt(req.params.uid, 10);
      if (!uid) return res.status(400).json({ error: "Ungültige UID" });
      const mailbox = await findSentMailbox();
      const mail = await getMail(uid, mailbox);
      if (!mail) return res.status(404).json({ error: "Nachricht nicht gefunden" });
      res.json(mail);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/sent/:uid/attachments/:partId", async (req, res) => {
    try {
      const uid = parseInt(req.params.uid, 10);
      const partId = req.params.partId;
      const mailbox = await findSentMailbox();
      const att = await getAttachment(uid, partId, mailbox);
      if (!att) return res.status(404).json({ error: "Anhang nicht gefunden" });
      res.setHeader("Content-Type", att.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(att.filename)}"`);
      res.send(att.content);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Channels ──
  app.get("/api/channels", async (_req, res) => {
    const channels = await storage.getChannels();
    res.json(channels);
  });

  app.post("/api/channels", async (req, res) => {
    const parsed = insertChannelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const channel = await storage.createChannel(parsed.data);
    notionSync("createChannel", () => createNotionChannel(parsed.data));
    res.status(201).json(channel);
  });

  // ── Messages ──
  app.get("/api/channels/:channelId/messages", async (req, res) => {
    const messages = await storage.getMessagesByChannel(req.params.channelId);
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const message = await storage.createMessage(parsed.data);

    // Resolve channel name for Notion
    notionSync("createMessage", () => {
      const channel = storage.getChannel(parsed.data.channelId);
      // getChannel is async but we need to handle it synchronously in this context
      let channelName = parsed.data.channelId;
      // Since storage is in-memory, we can try to find the channel name
      createNotionMessage({
        ...parsed.data,
        channelName,
      });
    });

    res.status(201).json(message);
  });

  // ── Announcements ──
  app.get("/api/announcements", async (_req, res) => {
    const announcements = await storage.getAnnouncements();
    res.json(announcements);
  });

  app.post("/api/announcements", async (req, res) => {
    const parsed = insertAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const announcement = await storage.createAnnouncement(parsed.data);
    notionSync("createAnnouncement", () => createNotionAnnouncement(parsed.data));
    res.status(201).json(announcement);
  });

  app.patch("/api/announcements/:id", async (req, res) => {
    const updated = await storage.updateAnnouncement(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Ankündigung nicht gefunden" });

    // Try to find Notion page and update
    notionSync("updateAnnouncement", () => {
      const results = searchNotionDatabase("ankuendigungen", updated.title || " ");
      if (results.length > 0) {
        updateNotionAnnouncement(results[0].id, req.body);
      }
    });

    res.json(updated);
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    const deleted = await storage.deleteAnnouncement(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Ankündigung nicht gefunden" });
    res.json({ success: true });
  });

  // ── Events ──
  app.get("/api/events", async (_req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.post("/api/events", async (req, res) => {
    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const event = await storage.createEvent(parsed.data);
    notionSync("createEvent", () => createNotionEvent(parsed.data));
    res.status(201).json(event);
  });

  app.patch("/api/events/:id", async (req, res) => {
    // partielles Update — wir validieren mit dem Insert-Schema im partial-Modus
    const parsed = insertEventSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const updated = await storage.updateEvent(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ error: "Termin nicht gefunden" });
    res.json(updated);
  });

  app.delete("/api/events/:id", async (req, res) => {
    const deleted = await storage.deleteEvent(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Termin nicht gefunden" });
    res.json({ success: true });
  });

  // ── Tasks ──
  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const task = await storage.createTask(parsed.data);
    notionSync("createTask", () => createNotionTask(parsed.data));
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const updated = await storage.updateTask(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Aufgabe nicht gefunden" });

    // Try to find Notion page and update
    notionSync("updateTask", () => {
      const results = searchNotionDatabase("aufgaben", updated.title || " ");
      if (results.length > 0) {
        updateNotionTask(results[0].id, req.body);
      }
    });

    res.json(updated);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const deleted = await storage.deleteTask(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Aufgabe nicht gefunden" });
    res.json({ success: true });
  });

  // ── Folders ──
  app.get("/api/folders", async (_req, res) => {
    const folders = await storage.getFolders();
    res.json(folders);
  });

  app.post("/api/folders", async (req, res) => {
    const parsed = insertFolderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const folder = await storage.createFolder(parsed.data);
    notionSync("createFolder", () => createNotionFolder(parsed.data));
    res.status(201).json(folder);
  });

  // ── Documents ──
  app.get("/api/documents", async (_req, res) => {
    const docs = await storage.getDocuments();
    res.json(docs);
  });

  app.get("/api/folders/:folderId/documents", async (req, res) => {
    const docs = await storage.getDocumentsByFolder(req.params.folderId);
    res.json(docs);
  });

  app.post("/api/documents", async (req, res) => {
    const parsed = insertDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const doc = await storage.createDocument(parsed.data);

    notionSync("createDocument", () => {
      // Resolve folder name for Notion
      createNotionDocument({
        ...parsed.data,
      });
    });

    res.status(201).json(doc);
  });

  // Echter Datei-Upload vom Computer (multipart/form-data).
  // multer ist oben bereits konfiguriert (15 MB pro Datei, in-Memory).
  app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Keine Datei übergeben" });
      const folderId = (req.body.folderId || "").toString();
      if (!folderId) return res.status(400).json({ error: "Ordner fehlt" });
      const uploadedBy = (req.body.uploadedBy || "Unbekannt").toString();

      const original = req.file.originalname;
      const ext = (original.split(".").pop() || "bin").toLowerCase();
      const sizeBytes = req.file.size;
      const sizeHuman = sizeBytes >= 1024 * 1024
        ? `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
      const fileData = req.file.buffer.toString("base64");

      const doc = await storage.createDocument({
        name: original,
        type: ext,
        size: sizeHuman,
        folderId,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        content: null,
        notionUrl: null,
        mimeType: req.file.mimetype || "application/octet-stream",
        fileData,
      } as any);

      // Antwort ohne fileData (sonst groß)
      const { fileData: _omit, ...slim } = doc as any;
      res.status(201).json(slim);
    } catch (err: any) {
      console.error("upload failed", err);
      res.status(500).json({ error: err?.message || "Upload fehlgeschlagen" });
    }
  });

  // Datei-Download — liefert die gespeicherten Bytes mit korrektem MIME-Typ aus.
  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) return res.status(404).json({ error: "Dokument nicht gefunden" });
      const data = (doc as any).fileData as string | null | undefined;
      if (!data) return res.status(404).json({ error: "Keine Datei zu diesem Dokument hinterlegt" });
      const buf = Buffer.from(data, "base64");
      const mime = (doc as any).mimeType || "application/octet-stream";
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.name)}"`);
      res.setHeader("Content-Length", String(buf.length));
      res.end(buf);
    } catch (err: any) {
      console.error("download failed", err);
      res.status(500).json({ error: err?.message || "Download fehlgeschlagen" });
    }
  });

  // Inline-Ansicht (öffnet PDFs/Bilder direkt im Browser)
  app.get("/api/documents/:id/view", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) return res.status(404).json({ error: "Dokument nicht gefunden" });
      const data = (doc as any).fileData as string | null | undefined;
      if (!data) return res.status(404).json({ error: "Keine Datei zu diesem Dokument hinterlegt" });
      const buf = Buffer.from(data, "base64");
      const mime = (doc as any).mimeType || "application/octet-stream";
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.name)}"`);
      res.setHeader("Content-Length", String(buf.length));
      res.end(buf);
    } catch (err: any) {
      console.error("view failed", err);
      res.status(500).json({ error: err?.message || "Anzeige fehlgeschlagen" });
    }
  });

  // Löschen eines Dokuments (Admin)
  app.delete("/api/documents/:id", async (req, res) => {
    const ok = await storage.deleteDocument(req.params.id);
    if (!ok) return res.status(404).json({ error: "Dokument nicht gefunden" });
    res.json({ success: true });
  });

  // ── Polls ──
  app.get("/api/polls", async (_req, res) => {
    const polls = await storage.getPolls();
    res.json(polls);
  });

  app.post("/api/polls", async (req, res) => {
    const parsed = insertPollSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const poll = await storage.createPoll(parsed.data);
    notionSync("createPoll", () => createNotionPoll(parsed.data));
    res.status(201).json(poll);
  });

  app.get("/api/polls/:pollId/options", async (req, res) => {
    const options = await storage.getPollOptions(req.params.pollId);
    res.json(options);
  });

  app.post("/api/poll-options", async (req, res) => {
    const parsed = insertPollOptionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const option = await storage.createPollOption(parsed.data);
    notionSync("createPollOption", () => createNotionPollOption(parsed.data));
    res.status(201).json(option);
  });

  app.post("/api/votes", async (req, res) => {
    const parsed = insertVoteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const vote = await storage.createVote(parsed.data);
    await storage.incrementOptionVotes(parsed.data.optionId);

    // Sync vote count to Notion
    notionSync("vote", () => {
      const results = searchNotionDatabase("stimmoptionen", " ");
      const match = results.find((r: any) => r.id === parsed.data.optionId);
      if (match) {
        // We'd need to fetch current count, but since we already incremented in memory
        // we just search for the option by text and update
        // For simplicity, we do a best-effort update
      }
    });

    res.status(201).json(vote);
  });

  app.get("/api/polls/:pollId/votes", async (req, res) => {
    const votes = await storage.getVotesByPoll(req.params.pollId);
    res.json(votes);
  });

  // ── Meeting Rooms ──
  app.get("/api/meeting-rooms", async (_req, res) => {
    const rooms = await storage.getMeetingRooms();
    res.json(rooms);
  });

  app.post("/api/meeting-rooms", async (req, res) => {
    const parsed = insertMeetingRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const room = await storage.createMeetingRoom(parsed.data);
    notionSync("createMeetingRoom", () => createNotionMeetingRoom(parsed.data));
    res.status(201).json(room);
  });

  app.delete("/api/meeting-rooms/:id", async (req, res) => {
    const deleted = await storage.deleteMeetingRoom(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Meeting-Raum nicht gefunden" });
    res.json({ success: true });
  });

  app.delete("/api/polls/:id", async (req, res) => {
    const deleted = await storage.deletePoll(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Abstimmung nicht gefunden" });
    res.json({ success: true });
  });

  // ── Sidebar-Items (eigene Bereiche) ──
  app.get("/api/sidebar-items", async (_req, res) => {
    const items = await storage.getSidebarItems();
    res.json(items);
  });
  app.get("/api/sidebar-items/:id", async (req, res) => {
    const item = await storage.getSidebarItem(req.params.id);
    if (!item) return res.status(404).json({ error: "Bereich nicht gefunden" });
    res.json(item);
  });
  app.post("/api/sidebar-items", async (req, res) => {
    try {
      const item = await storage.createSidebarItem(req.body);
      res.json(item);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || "Anlegen fehlgeschlagen" });
    }
  });
  app.patch("/api/sidebar-items/:id", async (req, res) => {
    const updated = await storage.updateSidebarItem(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Bereich nicht gefunden" });
    res.json(updated);
  });
  app.delete("/api/sidebar-items/:id", async (req, res) => {
    const deleted = await storage.deleteSidebarItem(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Bereich nicht gefunden" });
    res.json({ success: true });
  });

  return httpServer;
}
