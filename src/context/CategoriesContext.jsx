import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES_BY_TYPE, isCustomCategory } from "@shared/catalog.js";
import { api } from "@/lib/api";
import { customCategoryMeta, FALLBACK_META, getCategoryMeta } from "@/lib/categories";
import { useLanguage } from "@/hooks/useLanguage";
import { CategoriesContext } from "./CategoriesContextValue";

/*
Junta las categorias fijas (traducidas con i18n) con las propias de la
persona (vienen de /api/categories). Los movimientos guardan la clave:
"food" o "custom_12".
*/
export function CategoriesProvider({ children }) {
  const { t } = useLanguage();
  const [custom, setCustom] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(
    (signal) =>
      api.listCategories({ signal }).then(
        (items) => {
          setCustom(items);
          setLoaded(true);
          return items;
        },
        (error) => {
          if (error.name !== "AbortError") setLoaded(true);
          return null;
        },
      ),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  const value = useMemo(() => {
    const byKey = new Map(custom.map((item) => [item.key, item]));

    function nameOf(key) {
      if (!isCustomCategory(key)) return t(`cat_${key}`);
      // Mientras cargan (o si se borro en otra pestaña) se muestra "Otros".
      return byKey.get(key)?.name ?? t("cat_other");
    }

    function metaOf(key) {
      if (!isCustomCategory(key)) return getCategoryMeta(key);
      const item = byKey.get(key);
      return item ? customCategoryMeta(item) : FALLBACK_META;
    }

    // Claves de un tipo: primero las fijas y despues las propias.
    function keysOf(type) {
      const own = custom.filter((item) => item.type === type).map((item) => item.key);
      return [...(CATEGORIES_BY_TYPE[type] ?? []), ...own];
    }

    return { custom, loaded, reload, nameOf, metaOf, keysOf };
  }, [custom, loaded, reload, t]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}
