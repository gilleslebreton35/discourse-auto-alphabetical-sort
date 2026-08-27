import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.8", (api) => {
  const allowedCategories = String(settings.categories_cible || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  api.modifyClass("route:discovery.category", {
    pluginId: "auto-alphabetical-sort",

    beforeModel(transition) {
      const result = this._super(...arguments);

      if (!allowedCategories.length) {
        return result;
      }

      const queryParams = transition.to?.queryParams;
      if (!queryParams || queryParams.order || queryParams.q) {
        return result;
      }

      const params = transition.to.params.category_slug_path_with_id
        ? transition.to.params
        : (transition.to.parent?.params || {});

      const categoryPath = params.category_slug_path_with_id;
      if (!categoryPath) {
        return result;
      }

      const parts = String(categoryPath).split("/");
      const slugPath = parts.slice(0, -1).filter(Boolean).join("/");
      
      if (!allowedCategories.includes(slugPath)) {
        return result;
      }

      const categoryQuery = slugPath
        .split("/")
        .map((slug) => encodeURIComponent(slug))
        .join(":");
        
      const q = `=category:${categoryQuery} order:title-asc`;

      return this.transitionTo("filter", { queryParams: { q } });
    },
  });
});
