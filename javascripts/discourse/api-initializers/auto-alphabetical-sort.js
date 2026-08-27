import { apiInitializer } from "discourse/lib/api";

const LOG_PREFIX = "[auto-alphabetical-sort]";

export default apiInitializer("0.8", (api) => {
  // type:list => settings.categories_cible est DÉJÀ un tableau
  const allowedCategories = (settings.categories_cible || [])
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
        // 1. Ne pas rediriger si un filtre / tri est déjà demandé dans l'URL
        const queryParams = transition.to?.queryParams || {};
        if (queryParams.order || queryParams.q) {
          return result;
        }

        // 2. La catégorie résolue par la route : slug, slug_path, id
        if (!model) {
          return result;
        }
        const slugPath = (model.slug_path || []).join("/");

        console.warn(LOG_PREFIX, "catégorie visitée :", {
          id: model.id,
          slug: model.slug,
          slugPath,
        });

        // 3. On accepte slug OU id dans le réglage
        const isConfigured =
          allowedCategories.includes(slugPath) ||
          allowedCategories.includes(model.slug) ||
          allowedCategories.includes(String(model.id));

        if (!isConfigured) {
          return result;
        }

        // 4. Requête /filter : catégorie exacte + ordre alphabétique A→Z
        const categoryQuery = (model.slug_path || [model.slug])
          .map((slug) => encodeURIComponent(slug))
          .join(":");
        const q = `=category:${categoryQuery} order:title-asc`;

        console.warn(LOG_PREFIX, "redirection vers /filter?q=", q);

        // 5. Redirection (retournée pour arrêter la transition en cours)
        return this.transitionTo("filter", { queryParams: { q } });
      } catch (err) {
        // On ne casse jamais la navigation normale
        console.error(LOG_PREFIX, "erreur :", err);
        return result;
      }
    },
  });
});
