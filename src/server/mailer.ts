// Notification email au partenaire (Voie B) via l'API Mailjet v3.1 (HTTP, sans dépendance).
// Si les clés ne sont pas configurées, on logue (stub) sans bloquer la capture de lead.

interface LeadMail {
  partenaireEmail: string;
  partenaireNom: string;
  nom: string;
  email: string;
  tel?: string | null;
  formationTitre?: string | null;
  qualification?: Record<string, string>;
}

const QUALIF_LABELS: Record<string, string> = {
  budget: "Budget",
  delai: "Délai de démarrage",
  financement: "Financement",
  niveau: "Niveau actuel",
};

function qualifText(q?: Record<string, string>): string {
  if (!q) return "";
  const lines = Object.entries(q)
    .filter(([, v]) => v)
    .map(([k, v]) => `${QUALIF_LABELS[k] ?? k} : ${v}`);
  return lines.length ? "\nQualification :\n" + lines.map((l) => "  " + l).join("\n") + "\n" : "";
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
          `Formation : ${m.formationTitre ?? "—"}\n` +
          qualifText(m.qualification),
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

// Email de bienvenue envoyé au nouvel inscrit newsletter (non bloquant).
// Même pattern que sendLeadNotification : stub si les clés Mailjet ne sont pas configurées.
export async function sendWelcomeEmail(email: string): Promise<void> {
  const pub = process.env.MAILJET_API_KEY;
  const priv = process.env.MAILJET_API_SECRET;
  const fromEmail = process.env.MAIL_FROM;
  const fromName = process.env.MAIL_FROM_NAME ?? "Formation Santé Bien-être";
  const siteUrl = process.env.PUBLIC_URL ?? "https://formation-sante-bienetre.fr";

  if (!pub || !priv || !fromEmail) {
    console.log(`✉️  [stub mail] Bienvenue newsletter → ${email} (clés Mailjet non configurées)`);
    return;
  }

  const textPart =
    `Bonjour,\n\n` +
    `Merci pour votre inscription à la newsletter Formation Santé Bien-être !\n\n` +
    `Vous recevrez désormais nos conseils, les infos sur le financement CPF et les ` +
    `opportunités de formation en esthétique, massage bien-être, coiffure et soins.\n\n` +
    `Découvrir les formations : ${siteUrl}\n\n` +
    `À très vite,\nL'équipe ${fromName}\n\n` +
    `— Pour vous désinscrire, répondez simplement à cet email.`;

  const htmlPart =
    `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;line-height:1.6">` +
    `<p style="font-size:18px"><strong>Bienvenue 🌿</strong></p>` +
    `<p>Merci pour votre inscription à la newsletter <strong>Formation Santé Bien-être</strong> !</p>` +
    `<p>Vous recevrez désormais nos conseils, les infos sur le <strong>financement CPF</strong> ` +
    `et les opportunités de formation en esthétique, massage bien-être, coiffure et soins.</p>` +
    `<p style="margin:24px 0"><a href="${siteUrl}" ` +
    `style="background:#186749;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">` +
    `Découvrir les formations</a></p>` +
    `<p>À très vite,<br>L'équipe ${fromName}</p>` +
    `<p style="font-size:12px;color:#9ca3af;margin-top:28px">Pour vous désinscrire, répondez simplement à cet email.</p>` +
    `</div>`;

  const body = {
    Messages: [
      {
        From: { Email: fromEmail, Name: fromName },
        To: [{ Email: email }],
        Subject: "Bienvenue ! Vous êtes bien inscrit(e) 🌿",
        TextPart: textPart,
        HTMLPart: htmlPart,
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
    if (!res.ok) console.error(`✉️  Mailjet (bienvenue) a répondu ${res.status} : ${await res.text().catch(() => "")}`);
  } catch (e) {
    console.error("✉️  Échec envoi Mailjet (bienvenue) :", e);
  }
}
