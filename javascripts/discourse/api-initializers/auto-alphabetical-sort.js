import { apiInitializer } from "discourse/lib/api";

const LOG_PREFIX = "[auto-alphabetical-sort]";

export default apiInitializer("0.8", (api) => {
  // Normalisation : selon la version, le réglage type:list renvoie
  // soit un tableau ["docs", "faq"], soit une chaîne "docs|faq" (ou "").
  const raw = settings.categories_cible ?? "";
  const allowedCategories = (Array.isArray(raw) ? raw : String(raw).split("|"))
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  console.warn(LOG_PREFIX, "catégories configurées :", allowedCategories);

  api.modifyClass("route:discovery.category", {
    pluginId: "auto-alphabetical-sort",

    afterModel(model, transition) {
      const result = this._super(...arguments);
      if (!allowedCategories.length) {
        return result;
      }

      try {
        const queryParams = transition.to?.queryParams || {};
        if (queryParams.order || queryParams.q) {
          return result;
        }

        if (!model) {
          return result;
        }

        const slugPath = (model.slug_path || []).join("/");
        console.warn(LOG_PREFIX, "catégorie visitée :", {
          id: model.id,
          slug: model.slug,
          slugPath,
        });

        const isConfigured =
          allowedCategories.includes(slugPath) ||
          allowedCategories.includes(model.slug) ||
          allowedCategories.includes(String(model.id));

        if (!isConfigured) {
          return result;
        }

        const categoryQuery = (model.slug_path || [model.slug])
          .map((slug) => encodeURIComponent(slug))
          .join(":");
        const q = `=category:${categoryQuery} order:title-asc`;

        console.warn(LOG_PREFIX, "redirection vers /filter?q=", q);
        return this.transitionTo("filter", { queryParams: { q } });
      } catch (err) {
        console.error(LOG_PREFIX, "erreur :", err);
        return result;
      }
    },
  });
});
