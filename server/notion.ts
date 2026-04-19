/**
 * Notion Integration Helper
 * 
 * Uses the external-tool CLI to call Notion APIs.
 * Provides typed helper functions for each database operation.
 * 
 * Hybrid approach: in-memory storage for reads, Notion sync for writes.
 * 
 * NOTE: On external hosting (e.g. Render), the external-tool CLI is not available.
 * All functions gracefully return null when the CLI is missing.
 */

import { execSync } from "child_process";

// ── Check if external-tool CLI is available ──
let cliAvailable = false;
try {
  execSync("which external-tool", { encoding: "utf-8", timeout: 3000 });
  cliAvailable = true;
  console.log("[notion] external-tool CLI found — Notion sync enabled");
} catch {
  console.log("[notion] external-tool CLI not found — Notion sync disabled (standalone mode)");
}

// ── Database IDs ──
const DB_IDS = {
  mitglieder: "bae52271-c898-4328-8f74-a0fa40d0317b",
  kanaele: "e062ca16-719f-4da7-9888-d47e2a824348",
  nachrichten: "c021e02f-df0c-465f-b867-890b77cb1681",
  ankuendigungen: "6edb9bd7-fa01-4c92-9eb3-96ecc975956e",
  termine: "e89a09ac-826b-43e4-8942-1fe6aa74597f",
  aufgaben: "4c1a559e-da86-404e-9582-85e0ac38330b",
  ordner: "805ee93f-5a76-4843-8432-e15c22e97bde",
  dokumente: "677de0f3-76ce-439f-a614-a0da5083cdad",
  abstimmungen: "b5638f75-269b-4a64-b8a3-0603d0061056",
  stimmoptionen: "5d9b0f24-3ba7-4264-be22-26e7af019d70",
  meetingraeume: "4f381e0b-ba5e-4207-8f60-ef1b7df443f8",
} as const;

// ── Core CLI Wrapper ──

function callNotionTool(toolName: string, args: Record<string, any>): any {
  if (!cliAvailable) return null;
  
  const params = JSON.stringify({
    source_id: "notion_mcp",
    tool_name: toolName,
    arguments: args,
  });
  // Escape single quotes for shell
  const escaped = params.replace(/'/g, "'\\''");
  try {
    const result = execSync(`external-tool call '${escaped}'`, {
      timeout: 15000,
      encoding: "utf-8",
    });
    return JSON.parse(result);
  } catch (err: any) {
    console.error(`[notion] Error calling ${toolName}:`, err.message);
    return null;
  }
}

// ── Create Helpers ──

export function createNotionMember(data: {
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  avatar?: string | null;
  joinedAt?: string | null;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.mitglieder, type: "data_source_id" },
    pages: [{
      properties: {
        "Name": data.name,
        "E-Mail": data.email,
        ...(data.phone ? { "Telefon": data.phone } : {}),
        "Rolle": data.role,
        ...(data.avatar ? { "Avatar-Initialen": data.avatar } : {}),
        ...(data.joinedAt ? { "date:Mitglied seit:start": data.joinedAt } : {}),
      },
    }],
  });
}

export function createNotionChannel(data: {
  name: string;
  description?: string | null;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.kanaele, type: "data_source_id" },
    pages: [{
      properties: {
        "Kanalname": data.name,
        ...(data.description ? { "Beschreibung": data.description } : {}),
      },
    }],
  });
}

export function createNotionMessage(data: {
  channelId: string;
  memberId: string;
  memberName: string;
  content: string;
  createdAt: string;
  channelName?: string;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.nachrichten, type: "data_source_id" },
    pages: [{
      properties: {
        "Inhalt": data.content,
        "Absender": data.memberName,
        "Kanal": data.channelName || data.channelId,
        "date:Zeitstempel:start": data.createdAt,
        "date:Zeitstempel:is_datetime": 1,
      },
    }],
  });
}

export function createNotionAnnouncement(data: {
  title: string;
  content: string;
  priority: string;
  pinned?: boolean | null;
  authorId: string;
  authorName: string;
  createdAt: string;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.ankuendigungen, type: "data_source_id" },
    pages: [{
      properties: {
        "Titel": data.title,
        "Inhalt": data.content,
        "Priorität": data.priority,
        ...(data.pinned ? { "Angepinnt": "__YES__" } : {}),
        "Autor": data.authorName,
        "date:Datum:start": data.createdAt.split("T")[0],
      },
    }],
  });
}

export function createNotionEvent(data: {
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  endTime?: string | null;
  location?: string | null;
  category: string;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.termine, type: "data_source_id" },
    pages: [{
      properties: {
        "Titel": data.title,
        ...(data.description ? { "Beschreibung": data.description } : {}),
        "date:Datum:start": data.date,
        ...(data.time ? { "Uhrzeit Start": data.time } : {}),
        ...(data.endTime ? { "Uhrzeit Ende": data.endTime } : {}),
        ...(data.location ? { "Ort": data.location } : {}),
        "Kategorie": data.category,
      },
    }],
  });
}

export function createNotionTask(data: {
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  dueDate?: string | null;
  createdAt: string;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.aufgaben, type: "data_source_id" },
    pages: [{
      properties: {
        "Titel": data.title,
        ...(data.description ? { "Beschreibung": data.description } : {}),
        "Status": data.status,
        "Priorität": data.priority,
        ...(data.assigneeName ? { "Zuständig": data.assigneeName } : {}),
        ...(data.dueDate ? { "date:Fällig am:start": data.dueDate } : {}),
      },
    }],
  });
}

export function createNotionFolder(data: {
  name: string;
  parentId?: string | null;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.ordner, type: "data_source_id" },
    pages: [{
      properties: {
        "Ordnername": data.name,
      },
    }],
  });
}

export function createNotionDocument(data: {
  name: string;
  type: string;
  size: string;
  folderId: string;
  uploadedBy: string;
  uploadedAt: string;
  folderName?: string;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.dokumente, type: "data_source_id" },
    pages: [{
      properties: {
        "Dateiname": data.name,
        "Dateityp": data.type.toUpperCase(),
        "Dateigröße": data.size,
        "Ordner": data.folderName || data.folderId,
        "Hochgeladen von": data.uploadedBy,
        "date:Datum:start": data.uploadedAt.split("T")[0],
      },
    }],
  });
}

export function createNotionPoll(data: {
  title: string;
  description?: string | null;
  type: string;
  status: string;
  quorum?: number | null;
  createdBy: string;
  createdAt: string;
  endsAt?: string | null;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.abstimmungen, type: "data_source_id" },
    pages: [{
      properties: {
        "Frage": data.title,
        ...(data.description ? { "Beschreibung": data.description } : {}),
        "Typ": data.type,
        "Status": data.status,
        ...(data.quorum ? { "Quorum": data.quorum } : {}),
        "Erstellt von": data.createdBy,
        "date:Startdatum:start": data.createdAt.split("T")[0],
        ...(data.endsAt ? { "date:Enddatum:start": data.endsAt.split("T")[0] } : {}),
      },
    }],
  });
}

export function createNotionPollOption(data: {
  pollId: string;
  text: string;
  votes?: number | null;
  pollTitle?: string;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.stimmoptionen, type: "data_source_id" },
    pages: [{
      properties: {
        "Option": data.text,
        "Abstimmung": data.pollTitle || data.pollId,
        "Stimmen": data.votes || 0,
      },
    }],
  });
}

export function createNotionMeetingRoom(data: {
  name: string;
  description?: string | null;
  url?: string | null;
  isActive?: boolean | null;
  participants?: number | null;
  createdBy: string;
}): any {
  return callNotionTool("notion-create-pages", {
    parent: { data_source_id: DB_IDS.meetingraeume, type: "data_source_id" },
    pages: [{
      properties: {
        "Raumname": data.name,
        ...(data.description ? { "Beschreibung": data.description } : {}),
        ...(data.url ? { "BBB-Link": data.url } : {}),
        ...(data.isActive ? { "Aktiv": "__YES__" } : {}),
      },
    }],
  });
}

// ── Update Helpers ──

export function updateNotionTask(notionPageId: string, data: Record<string, any>): any {
  const properties: Record<string, any> = {};
  if (data.title) properties["Titel"] = data.title;
  if (data.description) properties["Beschreibung"] = data.description;
  if (data.status) properties["Status"] = data.status;
  if (data.priority) properties["Priorität"] = data.priority;
  if (data.assigneeName) properties["Zuständig"] = data.assigneeName;
  if (data.dueDate) properties["date:Fällig am:start"] = data.dueDate;

  if (Object.keys(properties).length === 0) return null;

  return callNotionTool("notion-update-page", {
    page_id: notionPageId,
    command: "update_properties",
    properties,
  });
}

export function updateNotionAnnouncement(notionPageId: string, data: Record<string, any>): any {
  const properties: Record<string, any> = {};
  if (data.title) properties["Titel"] = data.title;
  if (data.content) properties["Inhalt"] = data.content;
  if (data.priority) properties["Priorität"] = data.priority;
  if (data.pinned !== undefined) properties["Angepinnt"] = data.pinned ? "__YES__" : "__NO__";

  if (Object.keys(properties).length === 0) return null;

  return callNotionTool("notion-update-page", {
    page_id: notionPageId,
    command: "update_properties",
    properties,
  });
}

export function updateNotionPollOptionVotes(notionPageId: string, newVoteCount: number): any {
  return callNotionTool("notion-update-page", {
    page_id: notionPageId,
    command: "update_properties",
    properties: {
      "Stimmen": newVoteCount,
    },
  });
}

// ── Search Helpers (for finding Notion page IDs) ──

export function searchNotionDatabase(dbKey: keyof typeof DB_IDS, query: string = " "): any[] {
  const result = callNotionTool("notion-search", {
    query,
    data_source_url: `collection://${DB_IDS[dbKey]}`,
  });
  return result?.results || [];
}

export function fetchNotionPage(pageId: string): any {
  return callNotionTool("notion-fetch", { id: pageId });
}

// ── Utility: Parse properties from page text ──

export function parsePageProperties(pageText: string): Record<string, any> | null {
  const match = pageText.match(/<properties>\n(.*?)\n<\/properties>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}
