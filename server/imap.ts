import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";

// IMAP configuration via environment variables
const IMAP_HOST = process.env.IMAP_HOST || "imap.ionos.de";
const IMAP_PORT = parseInt(process.env.IMAP_PORT || "993", 10);
const IMAP_USER = process.env.SMTP_USER || "team@allengerechteswohnen.de";
const IMAP_PASS = process.env.SMTP_PASS || "";

export interface MailListItem {
  uid: number;
  seq: number;
  messageId: string;
  subject: string;
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  date: string; // ISO
  unread: boolean;
  flagged: boolean;
  hasAttachments: boolean;
  preview: string; // first ~180 chars of body
}

export interface MailDetail extends MailListItem {
  html: string | null;
  text: string | null;
  cc: { name?: string; address: string }[];
  attachments: { filename: string; contentType: string; size: number; partId: string }[];
  references: string[];
  inReplyTo: string | null;
}

function getConfigured(): boolean {
  return !!IMAP_PASS;
}

async function openClient(): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: IMAP_USER, pass: IMAP_PASS },
    logger: false,
  });
  await client.connect();
  return client;
}

function addrToObj(a: any): { name?: string; address: string } {
  if (!a) return { address: "" };
  if (Array.isArray(a)) return a[0] ? addrToObj(a[0]) : { address: "" };
  if (a.value && Array.isArray(a.value) && a.value[0]) {
    return { name: a.value[0].name || undefined, address: a.value[0].address || "" };
  }
  return { name: a.name || undefined, address: a.address || "" };
}

function addrsToArr(a: any): { name?: string; address: string }[] {
  if (!a) return [];
  if (a.value && Array.isArray(a.value)) {
    return a.value.map((v: any) => ({ name: v.name || undefined, address: v.address || "" }));
  }
  return [];
}

function makePreview(text: string | null, html: string | null): string {
  let src = text || "";
  if (!src && html) src = html.replace(/<[^>]+>/g, " ");
  return src.replace(/\s+/g, " ").trim().slice(0, 180);
}

export async function listInbox(opts: {
  mailbox?: string;
  limit?: number;
  search?: string;
} = {}): Promise<{ items: MailListItem[]; total: number; unseen: number }> {
  if (!getConfigured()) {
    throw new Error("IMAP nicht konfiguriert (SMTP_PASS fehlt)");
  }
  const mailbox = opts.mailbox || "INBOX";
  const limit = opts.limit || 50;

  const client = await openClient();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const status = await client.status(mailbox, { messages: true, unseen: true });
      const total = status.messages || 0;
      const unseen = status.unseen || 0;

      // Fetch most recent N messages (from end)
      const fromSeq = Math.max(1, total - limit + 1);
      const range = `${fromSeq}:${total}`;

      const items: MailListItem[] = [];
      if (total === 0) {
        return { items: [], total: 0, unseen: 0 };
      }

      for await (const msg of client.fetch(range, {
        uid: true,
        flags: true,
        envelope: true,
        bodyStructure: true,
        source: false,
        headers: ["Message-ID"],
      })) {
        const env = msg.envelope;
        if (!env) continue;

        // Detect attachments from body structure
        let hasAttachments = false;
        const bs: any = msg.bodyStructure;
        const walk = (node: any) => {
          if (!node) return;
          if (node.disposition === "attachment") hasAttachments = true;
          if (Array.isArray(node.childNodes)) node.childNodes.forEach(walk);
        };
        walk(bs);

        items.push({
          uid: msg.uid || 0,
          seq: msg.seq,
          messageId: env.messageId || "",
          subject: env.subject || "(kein Betreff)",
          from: env.from?.[0] ? { name: env.from[0].name, address: env.from[0].address || "" } : { address: "" },
          to: (env.to || []).map(a => ({ name: a.name, address: a.address || "" })),
          date: env.date ? new Date(env.date).toISOString() : new Date().toISOString(),
          unread: !(msg.flags && msg.flags.has("\\Seen")),
          flagged: !!(msg.flags && msg.flags.has("\\Flagged")),
          hasAttachments,
          preview: "",
        });
      }

      // Sort newest first
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      // Apply optional text search (subject/from/to)
      let filtered = items;
      if (opts.search && opts.search.trim()) {
        const q = opts.search.toLowerCase();
        filtered = items.filter(m =>
          m.subject.toLowerCase().includes(q) ||
          m.from.address.toLowerCase().includes(q) ||
          (m.from.name || "").toLowerCase().includes(q)
        );
      }
      return { items: filtered, total, unseen };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function getMail(uid: number, mailbox = "INBOX"): Promise<MailDetail | null> {
  if (!getConfigured()) {
    throw new Error("IMAP nicht konfiguriert");
  }
  const client = await openClient();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const msg = await client.fetchOne(String(uid), { uid: true, flags: true, envelope: true, source: true }, { uid: true });
      if (!msg || !msg.source) return null;

      const parsed: ParsedMail = await simpleParser(msg.source);

      const attachments = (parsed.attachments || []).map((a, i) => ({
        filename: a.filename || `attachment-${i + 1}`,
        contentType: a.contentType || "application/octet-stream",
        size: a.size || 0,
        partId: a.partId || String(i),
      }));

      const env = msg.envelope;
      return {
        uid: msg.uid || 0,
        seq: msg.seq,
        messageId: parsed.messageId || env?.messageId || "",
        subject: parsed.subject || "(kein Betreff)",
        from: addrToObj(parsed.from),
        to: addrsToArr(parsed.to),
        cc: addrsToArr(parsed.cc),
        date: (parsed.date || env?.date || new Date()).toISOString ? (parsed.date || new Date()).toISOString() : new Date().toISOString(),
        unread: !(msg.flags && msg.flags.has("\\Seen")),
        flagged: !!(msg.flags && msg.flags.has("\\Flagged")),
        hasAttachments: attachments.length > 0,
        preview: makePreview(parsed.text || null, parsed.html || null),
        html: parsed.html || null,
        text: parsed.text || null,
        attachments,
        references: parsed.references ? (Array.isArray(parsed.references) ? parsed.references : [parsed.references]) : [],
        inReplyTo: parsed.inReplyTo || null,
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function getAttachment(uid: number, partId: string, mailbox = "INBOX"): Promise<{ filename: string; contentType: string; content: Buffer } | null> {
  if (!getConfigured()) throw new Error("IMAP nicht konfiguriert");
  const client = await openClient();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      const msg = await client.fetchOne(String(uid), { uid: true, source: true }, { uid: true });
      if (!msg || !msg.source) return null;
      const parsed: ParsedMail = await simpleParser(msg.source);
      const att = (parsed.attachments || []).find((a, i) => (a.partId || String(i)) === partId);
      if (!att) return null;
      return {
        filename: att.filename || "attachment",
        contentType: att.contentType || "application/octet-stream",
        content: att.content as Buffer,
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function setFlags(uid: number, flags: { seen?: boolean; flagged?: boolean; deleted?: boolean }, mailbox = "INBOX"): Promise<void> {
  if (!getConfigured()) throw new Error("IMAP nicht konfiguriert");
  const client = await openClient();
  try {
    const lock = await client.getMailboxLock(mailbox);
    try {
      if (flags.seen === true) await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      if (flags.seen === false) await client.messageFlagsRemove(String(uid), ["\\Seen"], { uid: true });
      if (flags.flagged === true) await client.messageFlagsAdd(String(uid), ["\\Flagged"], { uid: true });
      if (flags.flagged === false) await client.messageFlagsRemove(String(uid), ["\\Flagged"], { uid: true });
      if (flags.deleted) {
        await client.messageMove(String(uid), "Trash", { uid: true }).catch(async () => {
          // Fallback: flag as deleted if Trash folder doesn't exist
          await client.messageFlagsAdd(String(uid), ["\\Deleted"], { uid: true });
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

// Findet den "Gesendet"-Ordner. IMAP-Server benennen ihn unterschiedlich:
// IONOS: "Sent", Apple: "Sent Messages", Outlook: "Sent Items", deutsch: "Gesendet".
// Wir bevorzugen den Special-Use-Flag \Sent, fallen ansonsten auf einen Namens-Match zurück.
let cachedSentMailbox: string | null = null;
export async function findSentMailbox(): Promise<string> {
  if (cachedSentMailbox) return cachedSentMailbox;
  if (!getConfigured()) throw new Error("IMAP nicht konfiguriert");
  const client = await openClient();
  try {
    const list = await client.list();
    // 1) Special-Use \Sent
    const bySpecial = list.find((m: any) => Array.isArray(m.specialUse) ? m.specialUse.includes("\\Sent") : m.specialUse === "\\Sent");
    if (bySpecial) { cachedSentMailbox = bySpecial.path; return bySpecial.path; }
    // 2) Namens-Match (englische und deutsche Varianten)
    const candidates = ["Sent", "INBOX.Sent", "Sent Items", "Sent Messages", "Gesendet", "Gesendete Objekte", "Gesendete Elemente", "INBOX.Gesendet"];
    const lowerMap = new Map(list.map((m: any) => [m.path.toLowerCase(), m.path]));
    for (const c of candidates) {
      const hit = lowerMap.get(c.toLowerCase());
      if (hit) { cachedSentMailbox = hit; return hit; }
    }
    // 3) Fallback: irgendeine Box mit "sent" oder "gesendet" im Namen
    const fuzzy = list.find((m: any) => /sent|gesendet/i.test(m.path));
    if (fuzzy) { cachedSentMailbox = fuzzy.path; return fuzzy.path; }
    throw new Error("Kein Postausgang-Ordner gefunden");
  } finally {
    await client.logout();
  }
}

export async function verifyImap(): Promise<{ ok: boolean; error?: string; mailboxes?: string[] }> {
  if (!getConfigured()) return { ok: false, error: "IMAP_PASS nicht gesetzt" };
  try {
    const client = await openClient();
    const list = await client.list();
    await client.logout();
    return { ok: true, mailboxes: list.map(m => m.path) };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
