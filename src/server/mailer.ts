// Notification email au partenaire (Voie B) via l'API Mailjet v3.1 (HTTP, sans dépendance).
// Si les clés ne sont pas configurées, on logue (stub) sans bloquer la capture de lead.

interface LeadMail {
  partenaireEmail: string;
  partenaireNom: string;
  nom: string;
  email: string;
  tel?: string | null;
  formationTitre?: string | null;
}

export async function sendLeadNotification(m: LeadMail): Promise<void> {
  const pub = process.env.MAILJET_API_KEY;
  const priv = process.env.MAILJET_API_SECRET;
  const fromEmail = process.env.MAIL_FROM;
  const fromName = process.env.MAIL_FROM_NAME ?? "Formation Santé Bien-être";

  if (!pub || !priv || !fromEmail) {
    console.log(
      `✉️  [stub mail] Nouveau lead pour ${m.partenaireNom} <${m.partenaireEmail}> : ${m.nom} / ${m.email}` +
        (m.tel ? ` / ${m.tel}` : "") +
        (m.formationTitre ? ` — « ${m.formationTitre} »` : "") +
        " (clés Mailjet non configurées)"
    );
    return;
  }

  const body = {
    Messages: [
      {
        From: { Email: fromEmail, Name: fromName },
        To: [{ Email: m.partenaireEmail, Name: m.partenaireNom }],
        Subject: `Nouveau lead — ${m.formationTitre ?? "formation"}`,
        TextPart:
          `Nouvelle demande d'information :\n\n` +
          `Nom : ${m.nom}\nEmail : ${m.email}\nTéléphone : ${m.tel ?? "—"}\n` +
          `Formation : ${m.formationTitre ?? "—"}\n`,
      },
    ],
  };

  try {
    const res = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${pub}:${priv}`).toString("base64"),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`✉️  Mailjet a répondu ${res.status} : ${await res.text().catch(() => "")}`);
  } catch (e) {
    console.error("✉️  Échec envoi Mailjet :", e);
  }
}
