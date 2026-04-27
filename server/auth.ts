import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { Member } from "@shared/schema";

// In-Memory-Sessions (überleben Neustart nicht — okay für ein internes Portal)
type Session = { memberId: string; expiresAt: number };
const sessions = new Map<string, Session>();
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "awg_session";

// Cookies parsen (Express hat das nicht eingebaut)
function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function newToken(): string {
  return randomBytes(32).toString("hex");
}

function setSessionCookie(res: Response, token: string) {
  const maxAge = SESSION_MS / 1000;
  // Path=/, HttpOnly, SameSite=Lax (kein Secure wegen ggf. lokaler Tests; Render ist HTTPS)
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax`,
  );
}

function clearSessionCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`,
  );
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Express-Erweiterung
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentMember?: Member;
    }
  }
}

// Liest Session aus Cookie und hängt currentMember an Request (wenn gültig)
export async function attachAuth(req: Request, _res: Response, next: NextFunction) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return next();
  const session = sessions.get(token);
  if (!session) return next();
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return next();
  }
  const member = await storage.getMember(session.memberId);
  if (member) req.currentMember = member;
  next();
}

// Nur eingeloggt
export function requireLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.currentMember) return res.status(401).json({ error: "Nicht angemeldet" });
  next();
}

// Nur Admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.currentMember) return res.status(401).json({ error: "Nicht angemeldet" });
  if (!req.currentMember.isAdmin) return res.status(403).json({ error: "Keine Admin-Rechte" });
  next();
}

// Mitglied einloggen → Cookie setzen
export function startSession(res: Response, memberId: string) {
  const token = newToken();
  sessions.set(token, { memberId, expiresAt: Date.now() + SESSION_MS });
  setSessionCookie(res, token);
}

export function endSession(req: Request, res: Response) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (token) sessions.delete(token);
  clearSessionCookie(res);
}

// Beim Server-Start aufrufen: stellt sicher, dass es mindestens einen Admin gibt.
// Wenn das vorgesehene Admin-Konto noch kein Passwort hat → setzen und in Logs ausgeben.
export async function ensureAdminBootstrap(): Promise<void> {
  const adminEmail = "kontakt@fredis-pflegekonzept.de";
  let admin = await storage.getMemberByEmail(adminEmail);

  if (!admin) {
    console.log(`[auth] Admin-Konto ${adminEmail} nicht gefunden — wird angelegt`);
    admin = await storage.createMember({
      name: "Fredi Orazem",
      email: adminEmail,
      phone: null,
      role: "Gründungsmitglied",
      avatar: "FO",
      profileImage: null,
      address: null,
      website: null,
      joinedAt: new Date().toISOString().slice(0, 10),
      passwordHash: null,
      isAdmin: true,
    } as any);
  }

  // Admin-Flag erzwingen
  if (!admin.isAdmin) {
    await storage.updateMember(admin.id, { isAdmin: true });
    admin = (await storage.getMember(admin.id)) as Member;
    console.log(`[auth] Admin-Flag für ${adminEmail} gesetzt`);
  }

  // Wenn noch kein Passwort gesetzt: Start-Passwort generieren und in Logs ausgeben
  if (!admin.passwordHash) {
    const startPw = process.env.AWG_BOOTSTRAP_PASSWORD || generateReadablePassword();
    const hash = await hashPassword(startPw);
    await storage.updateMember(admin.id, { passwordHash: hash });
    console.log(
      `\n========================================\n` +
        `[auth] START-PASSWORT für ${adminEmail}:\n` +
        `       ${startPw}\n` +
        `       (in den Render-Logs sichtbar — bitte sofort nach dem ersten Login ändern)\n` +
        `========================================\n`,
    );
  } else {
    console.log(`[auth] Admin-Konto ${adminEmail} ist eingerichtet (Passwort gesetzt)`);
  }
}

function generateReadablePassword(): string {
  // 4 Wörter + Zahl, gut zu tippen, gut zu merken
  const words = [
    "Apfel", "Berlin", "Donau", "Eiche", "Felsen", "Garten", "Hafen", "Insel",
    "Jaeger", "Kobalt", "Lampe", "Marder", "Nordlicht", "Olive", "Pinsel", "Quelle",
    "Rebe", "Sonne", "Tulpe", "Ufer", "Vogel", "Wolke", "Xanten", "Yacht", "Zypresse",
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${pick()}-${pick()}-${pick()}-${num}`;
}
