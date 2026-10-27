// Lo minimo que ocupa una porcion de una torta (2,5%, unos 9°): las categorias
// con muy poco gasto no quedan como una linea finita.
export const MIN_SLICE_SHARE = 0.025;

/*
Tamaño con que se dibuja cada porcion: la que es mas chica que el minimo se
agranda hasta el minimo y las demas se achican un poco en proporcion (el total
no cambia). Los montos y porcentajes que se muestran siguen siendo los reales.
*/
export function sliceSizes(values, minShare = MIN_SLICE_SHARE) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total || values.length * minShare >= 1) return values;
  const isSmall = (value) => value / total < minShare;
  const small = values.filter(isSmall).length;
  if (!small) return values;
  const restTotal = values.filter((value) => !isSmall(value)).reduce((sum, value) => sum + value, 0);
  const restShare = 1 - small * minShare;
  return values.map((value) => (isSmall(value) ? minShare : (value / restTotal) * restShare) * total);
}
