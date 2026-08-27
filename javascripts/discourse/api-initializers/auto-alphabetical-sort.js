import { apiInitializer } from "discourse/lib/api";

const LOG_PREFIX = "[auto-alphabetical-sort]";
const GUARD_KEY = "auto-alpha-last-redirect";

export default apiInitializer("0.8", (api) => {
  // type:list => selon la version : tableau OU chaîne "15|4|9"
  const raw = settings.categories_cible ?? "";
  const allowedIds = (Array.isArray(raw) ? raw : String(raw).split("|"))
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  console.warn(LOG_PREFIX, "catégories configurées (IDs) :", allowedIds);

  // Extrait { categoryPath, id } d'une URL du type /c/presentation-jeux/4/none
  const matches = (path) => {
    const m = path.match(/^\/c\/([^/]+(?:\/[^/]+)*)\/(\d+)(?:\/([^/?#]+))?(?:[?#].*)?$/);
    return m ? { categoryPath: m[1], id: m[2] } : null;
  };

  api.onPageChange((url) => {
    // "url" est généralement un chemin, parfois une URL complète
    const path = url?.startsWith("http") ? new URL(url).pathname : url;

    const matched = matches(path);
    if (!matched) {
      return; // pas une page de catégorie
    }

    // Ne pas interférer si l'utilisateur a déjà un tri ou filtre dans l'URL
    if (/\?.*(order=|q=)/.test(path)) {
      return;
    }

    if (!allowedIds.includes(matched.id)) {
      console.warn(LOG_PREFIX, "catégorie NON configurée :", matched);
      return;
    }

    // Éviter la re-redirection immédiate via le bouton "retour"
    if (sessionStorage.getItem(GUARD_KEY) === path) {
      sessionStorage.removeItem(GUARD_KEY);
      return;
    }

    const categoryQuery = matched.categoryPath
      .split("/")
      .map((slug) => encodeURIComponent(slug))
      .join(":");
    const q = `=category:${categoryQuery} order:title-asc`;

    console.warn(LOG_PREFIX, "redirection vers :", `/filter?q=${q}`);
    sessionStorage.setItem(GUARD_KEY, path);
    window.location.href = `/filter?q=${encodeURIComponent(q)}`;
  });
});
