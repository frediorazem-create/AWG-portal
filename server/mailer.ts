import nodemailer, { type Transporter } from "nodemailer";

// SMTP configuration via environment variables (for security)
// Set on Render: SMTP_USER, SMTP_PASS (and optionally SMTP_HOST, SMTP_PORT)
const SMTP_HOST = process.env.SMTP_HOST || "smtp.ionos.de";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "team@allengerechteswohnen.de";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "Allengerechtes Wohnen eG";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!SMTP_PASS) {
    console.warn("[mailer] SMTP_PASS not set — email sending disabled");
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for 587 (STARTTLS)
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    console.log(`[mailer] SMTP transporter configured: ${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER}`);
  }
  return transporter;
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendMailOptions {
  to: string[];              // recipient emails
  subject: string;
  body: string;              // plain text body
  replyTo?: string;          // optional Reply-To header
  attachments?: MailAttachment[];
  inReplyTo?: string;        // Message-ID being replied to (for threading)
  references?: string[];     // References header for threading
  useBcc?: boolean;          // if false, send as direct To (for replies)
}

export interface SendMailResult {
  success: boolean;
  sent: number;
  failed: string[];          // list of emails that failed
  error?: string;
}

export async function sendBulkMail(opts: SendMailOptions): Promise<SendMailResult> {
  const t = getTransporter();
  if (!t) {
    return { success: false, sent: 0, failed: opts.to, error: "SMTP nicht konfiguriert (SMTP_PASS fehlt)" };
  }

  // Use BCC for bulk (recipients don't see each other) or direct To for replies
  const useBcc = opts.useBcc !== false;
  try {
    const mailOpts: any = {
      from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
      subject: opts.subject,
      text: opts.body,
      html: opts.body.replace(/\n/g, "<br>"),
      replyTo: opts.replyTo || SMTP_USER,
    };
    if (useBcc) {
      mailOpts.to = SMTP_USER;
      mailOpts.bcc = opts.to;
    } else {
      mailOpts.to = opts.to;
    }
    if (opts.attachments && opts.attachments.length > 0) {
      mailOpts.attachments = opts.attachments.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      }));
    }
    if (opts.inReplyTo) mailOpts.inReplyTo = opts.inReplyTo;
    if (opts.references && opts.references.length > 0) mailOpts.references = opts.references;

    const info = await t.sendMail(mailOpts);
    console.log(`[mailer] Sent to ${opts.to.length} recipients. MessageId: ${info.messageId}`);
    return { success: true, sent: opts.to.length, failed: [] };
  } catch (err: any) {
    console.error("[mailer] Send failed:", err.message);
    return { success: false, sent: 0, failed: opts.to, error: err.message };
  }
}

export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) return { ok: false, error: "SMTP_PASS nicht gesetzt" };
  try {
    await t.verify();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
