import { apiInitializer } from "discourse/lib/api";
import { schedule } from "@ember/runloop";

const LOG_PREFIX = "[auto-alphabetical-sort]";

export default apiInitializer("0.8", (api) => {
  const raw = settings.categories_cible ?? "";
  const allowedIds = (Array.isArray(raw) ? raw : String(raw).split("|"))
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  console.warn(LOG_PREFIX, "catégories configurées (IDs) :", allowedIds);

  const sortTopics = () => {
    try {
      const router = api.container.lookup("service:router");
      const routeName = router.currentRoute?.name;
      if (!routeName?.startsWith("discovery.category")) {
        return; // pas une page de catégorie
      }

      const controller = api.container.lookup("controller:discovery/list") ||
                         api.container.lookup("controller:discovery/topics");
      const list = controller?.model;
      const topics = list?.topics;
      if (!topics?.length) {
        return;
      }

      const category = list?.category || controller?.category;
      if (!category || !allowedIds.includes(String(category.id))) {
        return;
      }

      console.warn(LOG_PREFIX, "re-tri de", topics.length, "sujets par titre (catégorie", category.id + ")");

      const sorted = [...topics].sort((a, b) =>
        String(a.title).localeCompare(String(b.title), undefined, {
          sensitivity: "base",
          numeric: true,
        })
      );

      // Remplacement de la collection => re-rendu de la liste
      controller.set("model.topics", sorted);
    } catch (err) {
      console.error(LOG_PREFIX, "erreur :", err);
    }
  };

  api.onPageChange(() => schedule("afterRender", sortTopics));
});
