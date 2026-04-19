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

    // ── Messages ──
    const msgData: { channelIdx: number; memberIdx: number; content: string; time: string }[] = [
      { channelIdx: 0, memberIdx: 0, content: "Willkommen im allgemeinen Kanal! Hier können wir alles besprechen, was die Genossenschaft betrifft.", time: "2026-03-10T09:00:00" },
      { channelIdx: 0, memberIdx: 2, content: "Danke Fredi! Ich freue mich auf die Zusammenarbeit.", time: "2026-03-10T09:15:00" },
      { channelIdx: 0, memberIdx: 1, content: "Die nächste Mitgliederversammlung ist am 25. März. Bitte tragt euch den Termin ein!", time: "2026-03-10T10:30:00" },
      { channelIdx: 0, memberIdx: 4, content: "Ist schon notiert. Gibt es eine vorläufige Tagesordnung?", time: "2026-03-10T11:00:00" },
      { channelIdx: 0, memberIdx: 0, content: "Ja, ich schicke die Tagesordnung bis Ende der Woche per E-Mail raus.", time: "2026-03-10T11:15:00" },
      { channelIdx: 1, memberIdx: 1, content: "Der Notartermin für die Satzung steht jetzt fest: 2. April 2026.", time: "2026-03-11T08:00:00" },
      { channelIdx: 1, memberIdx: 3, content: "Super! Hat der Anwalt die letzte Version der Satzung schon geprüft?", time: "2026-03-11T08:30:00" },
      { channelIdx: 1, memberIdx: 1, content: "Ja, die finale Fassung liegt seit gestern vor. Ich lade sie in den Dokumenten-Bereich hoch.", time: "2026-03-11T09:00:00" },
      { channelIdx: 1, memberIdx: 6, content: "Können wir die Änderungen noch einmal in der AG besprechen?", time: "2026-03-11T09:30:00" },
      { channelIdx: 2, memberIdx: 5, content: "Die aktuelle Kalkulation zeigt, dass wir mindestens 15 Mitglieder für die Gründung brauchen.", time: "2026-03-12T10:00:00" },
      { channelIdx: 2, memberIdx: 0, content: "Das Eigenkapital liegt aktuell bei ca. 120.000 €. Wir brauchen weitere Genossenschaftsanteile.", time: "2026-03-12T10:30:00" },
      { channelIdx: 2, memberIdx: 7, content: "Wie hoch ist der Anteil pro Mitglied?", time: "2026-03-12T11:00:00" },
      { channelIdx: 2, memberIdx: 5, content: "Der Pflichtanteil beträgt 500 €. Weitere Anteile sind freiwillig à 500 € möglich.", time: "2026-03-12T11:15:00" },
      { channelIdx: 3, memberIdx: 4, content: "Der Architekt hat die ersten Entwürfe für das Gemeinschaftshaus geschickt. Sieht vielversprechend aus!", time: "2026-03-13T14:00:00" },
      { channelIdx: 3, memberIdx: 2, content: "Können wir die Grundrisse in der nächsten AG Bauplanung besprechen?", time: "2026-03-13T14:30:00" },
      { channelIdx: 3, memberIdx: 4, content: "Klar, ich bereite eine Präsentation vor. Termin ist Donnerstag 16 Uhr.", time: "2026-03-13T15:00:00" },
    ];
    msgData.forEach((m) => {
      const id = randomUUID();
      const memberArr = Array.from(this.members.values());
      this.messages.set(id, {
        id,
        channelId: channelIds[m.channelIdx],
        memberId: memberIds[m.memberIdx],
        memberName: memberArr[m.memberIdx].name,
        content: m.content,
        createdAt: m.time,
      });
    });

    // ── Announcements ──
    const annData: InsertAnnouncement[] = [
      { title: "Gründungsversammlung am 25. März 2026", content: "Liebe Mitglieder, wir laden herzlich zur Gründungsversammlung ein. Tagesordnung: Wahl des Vorstands, Beschluss der Satzung, Finanzplanung 2026. Ort: Bürgerhaus Mitte, Saal 3.", priority: "Dringend", pinned: true, authorId: memberIds[0], authorName: "Fredi Orazem", createdAt: "2026-03-14T10:00:00" },
      { title: "Neue Satzungsentwurf verfügbar", content: "Der überarbeitete Satzungsentwurf v3.2 steht im Dokumentenbereich unter 'Satzung' zum Download bereit. Bitte bis zum 20. März Feedback geben.", priority: "Wichtig", pinned: true, authorId: memberIds[1], authorName: "Markus Stegfellner", createdAt: "2026-03-12T14:00:00" },
      { title: "Willkommen Ute Blaumann!", content: "Wir freuen uns, Ute Blaumann als neues Mitglied begrüßen zu dürfen. Herzlich willkommen im Team!", priority: "Normal", pinned: false, authorId: memberIds[0], authorName: "Fredi Orazem", createdAt: "2026-03-10T09:00:00" },
      { title: "AG Finanzen – Zwischenbericht", content: "Der Zwischenbericht der AG Finanzen zeigt positive Entwicklungen. Die Eigenkapitalquote liegt bei 38%. Details im Finanzen-Ordner.", priority: "Normal", pinned: false, authorId: memberIds[5], authorName: "Frank Stegmann", createdAt: "2026-03-08T16:00:00" },
      { title: "Grundstücksbesichtigung am 5. April", content: "Die Besichtigung des Grundstücks findet am 5. April um 14 Uhr statt. Treffpunkt vor Ort. Bitte um Anmeldung!", priority: "Wichtig", pinned: false, authorId: memberIds[4], authorName: "Frank Löffler", createdAt: "2026-03-06T11:00:00" },
      { title: "Sprechstunde des Vorstands", content: "Ab sofort bieten wir jeden Dienstag von 17-18 Uhr eine offene Sprechstunde an. Kommen Sie vorbei oder melden Sie sich per Chat.", priority: "Normal", pinned: false, authorId: memberIds[1], authorName: "Markus Stegfellner", createdAt: "2026-03-04T09:00:00" },
    ];
    annData.forEach((a) => {
      const id = randomUUID();
      this.announcements.set(id, { ...a, id });
    });

    // ── Events ──
    const eventData: InsertEvent[] = [
      { title: "Gründungsversammlung", description: "Offizielle Gründungsversammlung der Genossenschaft mit Wahl des Vorstands und Beschluss der Satzung.", date: "2026-03-25", time: "18:00", endTime: "21:00", location: "Bürgerhaus Mitte, Saal 3", category: "Versammlung" },
      { title: "AG Bauplanung", description: "Besprechung der Architektenentwürfe und Grundrissplanung.", date: "2026-03-19", time: "16:00", endTime: "18:00", location: "Online (BigBlueButton)", category: "Workshop" },
      { title: "Notartermin Satzung", description: "Notarielle Beurkundung der Genossenschaftssatzung.", date: "2026-04-02", time: "10:00", endTime: "11:30", location: "Notariat Dr. Schmidt, Hauptstr. 15", category: "Sonstiges" },
      { title: "Grundstücksbesichtigung", description: "Besichtigung des potenziellen Baugrundstücks Lindenstraße 42.", date: "2026-04-05", time: "14:00", endTime: "15:30", location: "Lindenstraße 42", category: "Treffen" },
      { title: "Workshop: Gemeinschaftliches Wohnen", description: "Impulsvortrag und Diskussion zu Modellen des gemeinschaftlichen Wohnens.", date: "2026-04-12", time: "10:00", endTime: "16:00", location: "Volkshochschule, Raum 204", category: "Workshop" },
      { title: "Vorstandssitzung", description: "Reguläre monatliche Vorstandssitzung.", date: "2026-04-15", time: "19:00", endTime: "21:00", location: "Online (BigBlueButton)", category: "Versammlung" },
      { title: "Infoabend für Interessenten", description: "Offener Infoabend für potenzielle neue Mitglieder der Genossenschaft.", date: "2026-04-22", time: "18:00", endTime: "20:00", location: "Stadtteilzentrum, Großer Saal", category: "Treffen" },
      { title: "AG Finanzen Quartalsbericht", description: "Vorstellung und Diskussion des Q1 2026 Finanzberichts.", date: "2026-04-28", time: "17:00", endTime: "18:30", location: "Online (BigBlueButton)", category: "Workshop" },
      { title: "Frühlingsfest der Genossenschaft", description: "Gemütliches Beisammensein mit Grillen im Gemeinschaftsgarten.", date: "2026-05-10", time: "15:00", endTime: "20:00", location: "Gemeinschaftsgarten, Am Park 8", category: "Treffen" },
      { title: "Mitgliederversammlung Q2", description: "Ordentliche Mitgliederversammlung mit Berichten und Abstimmungen.", date: "2026-06-20", time: "18:00", endTime: "21:00", location: "Bürgerhaus Mitte, Saal 3", category: "Versammlung" },
    ];
    eventData.forEach((e) => {
      const id = randomUUID();
      this.events.set(id, { ...e, id });
    });

    // ── Tasks ──
    const taskData: InsertTask[] = [
      { title: "Satzung finalisieren", description: "Letzte Korrekturen am Satzungsentwurf v3.2 einarbeiten und dem Notar übermitteln.", status: "In Bearbeitung", priority: "Hoch", assigneeId: memberIds[1], assigneeName: "Markus Stegfellner", dueDate: "2026-03-20", createdAt: "2026-03-01T10:00:00" },
      { title: "Finanzplan 2026 erstellen", description: "Detaillierten Finanzplan mit Einnahmen/Ausgaben-Prognose für die Gründungsphase erstellen.", status: "In Bearbeitung", priority: "Hoch", assigneeId: memberIds[5], assigneeName: "Frank Stegmann", dueDate: "2026-03-22", createdAt: "2026-03-02T09:00:00" },
      { title: "Mitgliederverzeichnis aktualisieren", description: "Alle aktuellen und angemeldeten Mitglieder im Verzeichnis erfassen.", status: "Erledigt", priority: "Mittel", assigneeId: memberIds[0], assigneeName: "Fredi Orazem", dueDate: "2026-03-10", createdAt: "2026-02-28T14:00:00" },
      { title: "Architektenbriefing vorbereiten", description: "Anforderungskatalog und Raumprogramm für den Architekten zusammenstellen.", status: "In Bearbeitung", priority: "Hoch", assigneeId: memberIds[4], assigneeName: "Frank Löffler", dueDate: "2026-03-18", createdAt: "2026-03-05T11:00:00" },
      { title: "Bankgespräch KfW-Förderung", description: "Termin mit der GLS Bank für KfW-Fördermittel vereinbaren und Unterlagen vorbereiten.", status: "Offen", priority: "Hoch", assigneeId: memberIds[5], assigneeName: "Frank Stegmann", dueDate: "2026-03-28", createdAt: "2026-03-08T10:00:00" },
      { title: "Website Genossenschaft erstellen", description: "Einfache Informationswebsite mit Projektbeschreibung und Kontaktformular.", status: "Offen", priority: "Mittel", assigneeId: memberIds[6], assigneeName: "Dagmar-Judith Kormannshaus-Mathiesen", dueDate: "2026-04-15", createdAt: "2026-03-10T09:00:00" },
      { title: "Genossenschaftsregister-Eintrag", description: "Unterlagen für die Eintragung ins Genossenschaftsregister zusammenstellen.", status: "Offen", priority: "Hoch", assigneeId: memberIds[1], assigneeName: "Markus Stegfellner", dueDate: "2026-04-10", createdAt: "2026-03-10T10:00:00" },
      { title: "Protokoll Gründungsversammlung", description: "Schriftführung und Protokollerstellung für die Gründungsversammlung.", status: "Offen", priority: "Mittel", assigneeId: memberIds[2], assigneeName: "Martina Model", dueDate: "2026-03-27", createdAt: "2026-03-12T08:00:00" },
      { title: "Beitrittserklärungen drucken", description: "50 Beitrittserklärungen und Informationsblätter für den Infoabend drucken.", status: "Erledigt", priority: "Niedrig", assigneeId: memberIds[7], assigneeName: "Ute Blaumann", dueDate: "2026-03-15", createdAt: "2026-03-05T14:00:00" },
      { title: "Energiekonzept recherchieren", description: "Verschiedene nachhaltige Energiekonzepte (Wärmepumpe, Solar, etc.) vergleichen.", status: "In Bearbeitung", priority: "Mittel", assigneeId: memberIds[4], assigneeName: "Frank Löffler", dueDate: "2026-04-20", createdAt: "2026-03-10T11:00:00" },
      { title: "Logo und Corporate Design", description: "Entwurf eines Logos und grundlegenden Corporate Designs für die Genossenschaft.", status: "Offen", priority: "Niedrig", assigneeId: memberIds[6], assigneeName: "Dagmar-Judith Kormannshaus-Mathiesen", dueDate: "2026-04-30", createdAt: "2026-03-12T10:00:00" },
      { title: "Flyer für Infoabend gestalten", description: "Einladungsflyer für den Infoabend am 22. April entwerfen und verteilen.", status: "Offen", priority: "Mittel", assigneeId: memberIds[2], assigneeName: "Martina Model", dueDate: "2026-04-10", createdAt: "2026-03-14T09:00:00" },
      { title: "Versicherungsangebote einholen", description: "Angebote für Bauherrenhaftpflicht und Gebäudeversicherung vergleichen.", status: "Offen", priority: "Niedrig", assigneeId: memberIds[3], assigneeName: "Rudolf Pfänder", dueDate: "2026-05-01", createdAt: "2026-03-14T15:00:00" },
      { title: "Gemeinschaftsraum planen", description: "Konzept für die Nutzung und Ausstattung des Gemeinschaftsraums erarbeiten.", status: "Erledigt", priority: "Mittel", assigneeId: memberIds[7], assigneeName: "Ute Blaumann", dueDate: "2026-03-08", createdAt: "2026-02-20T10:00:00" },
      { title: "Prüfungsverband kontaktieren", description: "Kontakt zum genossenschaftlichen Prüfungsverband herstellen und Beratungsgespräch vereinbaren.", status: "In Bearbeitung", priority: "Hoch", assigneeId: memberIds[0], assigneeName: "Fredi Orazem", dueDate: "2026-03-25", createdAt: "2026-03-13T11:00:00" },
    ];
    taskData.forEach((t) => {
      const id = randomUUID();
      this.tasks.set(id, { ...t, id });
    });

    // ── Folders ──
    const folderData: InsertFolder[] = [
      { name: "Satzung", parentId: null },
      { name: "Protokolle", parentId: null },
      { name: "Finanzen", parentId: null },
      { name: "Bauplanung", parentId: null },
      { name: "Formulare", parentId: null },
    ];
    const folderIds: string[] = [];
    folderData.forEach((f) => {
      const id = randomUUID();
      folderIds.push(id);
      this.folders.set(id, { ...f, id });
    });

    // ── Documents ──
    const docData: InsertDocument[] = [
      { name: "Satzungsentwurf_v3.2.pdf", type: "pdf", size: "245 KB", folderId: folderIds[0], uploadedBy: "Markus Stegfellner", uploadedAt: "2026-03-12T14:00:00" },
      { name: "Satzung_Kommentare_Anwalt.docx", type: "docx", size: "128 KB", folderId: folderIds[0], uploadedBy: "Markus Stegfellner", uploadedAt: "2026-03-10T10:00:00" },
      { name: "Mustersatzung_Genossenschaft.pdf", type: "pdf", size: "320 KB", folderId: folderIds[0], uploadedBy: "Fredi Orazem", uploadedAt: "2026-02-15T09:00:00" },
      { name: "Protokoll_AG_Bauplanung_2026-03-05.pdf", type: "pdf", size: "180 KB", folderId: folderIds[1], uploadedBy: "Frank Löffler", uploadedAt: "2026-03-06T10:00:00" },
      { name: "Protokoll_Vorstandssitzung_2026-02-20.pdf", type: "pdf", size: "156 KB", folderId: folderIds[1], uploadedBy: "Martina Model", uploadedAt: "2026-02-21T09:00:00" },
      { name: "Protokoll_Mitgliederversammlung_2026-01.pdf", type: "pdf", size: "210 KB", folderId: folderIds[1], uploadedBy: "Martina Model", uploadedAt: "2026-01-28T16:00:00" },
      { name: "Finanzplan_2026_Entwurf.xlsx", type: "xlsx", size: "85 KB", folderId: folderIds[2], uploadedBy: "Frank Stegmann", uploadedAt: "2026-03-08T14:00:00" },
      { name: "Kostenvoranschlag_Architekt.pdf", type: "pdf", size: "520 KB", folderId: folderIds[2], uploadedBy: "Frank Löffler", uploadedAt: "2026-03-05T11:00:00" },
      { name: "KfW_Foerderung_Uebersicht.pdf", type: "pdf", size: "310 KB", folderId: folderIds[2], uploadedBy: "Frank Stegmann", uploadedAt: "2026-02-28T10:00:00" },
      { name: "Grundriss_EG_Entwurf.pdf", type: "pdf", size: "1.2 MB", folderId: folderIds[3], uploadedBy: "Frank Löffler", uploadedAt: "2026-03-13T14:00:00" },
      { name: "Grundriss_OG_Entwurf.pdf", type: "pdf", size: "980 KB", folderId: folderIds[3], uploadedBy: "Frank Löffler", uploadedAt: "2026-03-13T14:15:00" },
      { name: "Lageplan_Lindenstrasse_42.pdf", type: "pdf", size: "2.1 MB", folderId: folderIds[3], uploadedBy: "Rudolf Pfänder", uploadedAt: "2026-03-01T10:00:00" },
      { name: "Energiekonzept_Vergleich.xlsx", type: "xlsx", size: "120 KB", folderId: folderIds[3], uploadedBy: "Frank Löffler", uploadedAt: "2026-03-10T15:00:00" },
      { name: "Beitrittserklärung.pdf", type: "pdf", size: "95 KB", folderId: folderIds[4], uploadedBy: "Fredi Orazem", uploadedAt: "2026-02-01T09:00:00" },
      { name: "Mitgliedsantrag_Formular.docx", type: "docx", size: "78 KB", folderId: folderIds[4], uploadedBy: "Fredi Orazem", uploadedAt: "2026-02-01T09:30:00" },
      { name: "Selbstauskunft_Formular.pdf", type: "pdf", size: "110 KB", folderId: folderIds[4], uploadedBy: "Frank Stegmann", uploadedAt: "2026-02-15T14:00:00" },
    ];
    docData.forEach((d) => {
      const id = randomUUID();
      this.documents.set(id, { ...d, id });
    });

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
