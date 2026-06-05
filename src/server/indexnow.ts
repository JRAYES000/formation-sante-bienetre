// IndexNow — notifie Bing & Yandex des URLs nouvelles/modifiées (gratuit, instantané).
// La clé est PUBLIQUE par conception (hébergée sur le site pour prouver la propriété).
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "b023e205b6815384a621aecca162e610";
const HOST = process.env.INDEXNOW_HOST || "formation-sante-bienetre.fr";

export async function submitIndexNow(urls: string[]): Promise<{ ok: boolean; status: number; count: number }> {
  const urlList = [...new Set(urls)].slice(0, 10000);
  if (urlList.length === 0) return { ok: true, status: 0, count: 0 };
  const body = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
    urlList,
  };
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status, count: urlList.length };
  } catch {
    return { ok: false, status: 0, count: urlList.length };
  }
}
