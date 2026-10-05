# bolsillox

bolsillox es una aplicacion web para registrar y visualizar tus finanzas personales: ingresos, gastos, saldo, graficos y un historial con filtros. Es una app de un solo usuario (sin login) con frontend en React y una API REST en Node + Express + SQLite.

## Funcionalidades

- **Movimientos (CRUD):** crear, editar y eliminar ingresos y gastos desde un formulario en un dialogo.
- **Validaciones en front y back:** el mismo schema de [zod](https://zod.dev) (`shared/movementSchema.js`) valida el formulario y la API. Titulo requerido, monto mayor a 0, fecha valida, categoria acorde al tipo y metodo de pago de la lista. Los errores se muestran traducidos.
- **Dashboard:** saldo acumulado, ingresos y gastos del mes con variacion contra el mes anterior, tasa de ahorro, grafico de ingresos vs. gastos (ultimos 6 meses), gastos por categoria y ultimos movimientos. Se puede navegar entre meses.
- **Historial:** busqueda por texto, filtros por tipo, categoria, metodo de pago y rango de fechas, y orden por fecha, monto o titulo. Los filtros quedan en la URL.
- **Pesos y dolares:** cada movimiento puede ser en ARS o USD. La cotizacion (oficial, blue o MEP) se toma de [dolarapi.com](https://dolarapi.com), se guarda en cache 30 minutos y, si la API no responde, se usa el ultimo valor o una cotizacion manual. Los totales se pueden ver en pesos o en dolares.
- **Recurrentes:** el sueldo, el alquiler o las suscripciones se cargan una vez ("se repite todos los meses") y se generan solos el dia indicado. Se pueden pausar, editar o darles fecha de fin; si borras un movimiento generado, no se vuelve a crear.
- **Presupuestos:** tope mensual (en pesos) por categoria de gasto, con barra de progreso, estado ("vas bien", "cerca del limite", "te pasaste") y aviso al cargar un gasto que te acerca o te pasa del tope.
- **Ajustes:** moneda de los totales, fuente de la cotizacion, idioma y enlace al repositorio.
- **Idiomas:** espanol / ingles (se recuerda la eleccion). Montos en ARS con `Intl.NumberFormat` y fechas segun el idioma.
- **Pensada para el celular:** navegacion inferior con boton "+" para cargar desde cualquier pantalla, formularios como hoja inferior con botones siempre visibles, areas tactiles de 44px, inputs de 16px (sin zoom en iOS), filas que se tocan enteras para editar y soporte de zonas seguras (notch). Se puede agregar a la pantalla de inicio (manifest).
- **Accesibilidad:** sin violaciones en axe-core (WCAG 2.1 AA), enlace "saltar al contenido", foco visible, anuncios para lectores de pantalla, tabla alternativa para el grafico, categorias identificadas por color + icono + nombre y respeto de "reducir movimiento".
- **Estados de carga, error y vacio** y notificaciones al guardar.

## Tecnologias

- **Frontend:** React 19, Vite, React Router, Tailwind CSS 4, shadcn/ui (Radix UI), Chart.js, lucide-react. Fuentes Geist y Bricolage Grotesque (empaquetadas con Fontsource).
- **Backend:** Node.js, Express 5, SQLite nativo de Node (`node:sqlite`, no hay que compilar nada), zod.
- **Calidad:** ESLint, tests de la API con `node:test`.

## Requisitos

- Node.js **22.12 o superior** (usa el modulo `node:sqlite` incluido en Node; no hace falta Python ni Visual Studio).

## Instalacion

```bash
npm install
```

## Desarrollo

Levanta la API (puerto 3001) y Vite (puerto 5173) al mismo tiempo:

```bash
npm run dev
```

Abri http://localhost:5173. Vite redirige las llamadas a `/api` hacia la API.

La primera vez se crea la base `server/data/bolsillox.db` con datos de ejemplo de los ultimos meses. Para empezar de cero, borra la carpeta `server/data/`.

Tambien podes levantar cada parte por separado:

```bash
npm run dev:server   # solo API (se reinicia al guardar cambios)
npm run dev:client   # solo frontend
```

## Produccion

```bash
npm run build   # genera dist/
npm start       # sirve la API y el frontend en http://localhost:3001
```

## Scripts

| Script | Descripcion |
| --- | --- |
| `npm run dev` | API + frontend en modo desarrollo |
| `npm run build` | Build de produccion del frontend |
| `npm start` | Servidor de produccion (API + `dist/`) |
| `npm test` | Tests de la API |
| `npm run lint` | ESLint |

El CI de GitHub Actions corre lint, tests y build en cada pull request (Node 22 y 24).

### Variables de entorno (opcionales)

| Variable | Default | Uso |
| --- | --- | --- |
| `PORT` | `3001` | Puerto de la API |
| `DB_PATH` | `server/data/bolsillox.db` | Archivo SQLite |
| `VITE_API_PROXY` | `http://localhost:3001` | Destino del proxy `/api` de Vite |
| `RATES_URL` | `https://dolarapi.com/v1/dolares` | API de cotizaciones (para usar un mock en desarrollo) |

## API

Base: `/api`. Todas las respuestas son JSON.

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/health` | Estado del servidor |
| `GET` | `/movements` | Lista de movimientos. Query: `q`, `type`, `category`, `paymentMethod`, `from`, `to` (YYYY-MM-DD), `sort` (`date`, `amount`, `title`), `order` (`asc`, `desc`), `limit` |
| `GET` | `/movements/:id` | Un movimiento |
| `POST` | `/movements` | Crea un movimiento |
| `PUT` | `/movements/:id` | Reemplaza un movimiento |
| `DELETE` | `/movements/:id` | Elimina un movimiento |
| `GET` | `/summary?month=YYYY-MM&currency=ARS\|USD` | Resumen del mes en la moneda pedida (saldo, totales, variacion, por categoria, ultimos 6 meses, ultimos movimientos) |
| `GET` | `/recurring` | Reglas recurrentes (con proxima fecha) |
| `POST` | `/recurring` | Crea una regla y genera los meses que ya vencieron |
| `PUT` | `/recurring/:id` | Edita una regla (aplica a los proximos meses) |
| `DELETE` | `/recurring/:id` | Borra la regla (los movimientos generados se conservan) |
| `GET` | `/budgets?month=YYYY-MM` | Presupuestos con gastado, porcentaje y estado |
| `PUT` | `/budgets/:category` | Crea o cambia el tope de una categoria de gasto |
| `DELETE` | `/budgets/:category` | Quita el presupuesto |
| `GET` | `/rates` | Cotizaciones (oficial, blue, MEP), fuente elegida y cotizacion activa |
| `PUT` | `/rates/settings` | Elige la fuente (`oficial`, `blue`, `mep` o `manual` con `manualRate`) |

Cuerpo de un movimiento:

```json
{
  "type": "expense",
  "title": "Supermercado",
  "amount": 24500,
  "currency": "ARS",
  "date": "2026-06-01",
  "category": "food",
  "paymentMethod": "credit",
  "note": ""
}
```

Las categorias y metodos de pago validos estan en `shared/catalog.js`. Si la validacion falla, la API responde `400` con los campos y la clave de traduccion del error:

```json
{ "error": "validation_error", "fields": { "amount": "errorAmountPositive" } }
```

## Estructura

```text
server/           API REST (Express + SQLite)
  app.js          Rutas y middlewares
  db.js           Conexion, migraciones y datos de ejemplo
  recurring.js    Generacion de movimientos recurrentes
  budgets.js      Presupuestos por categoria
  rates.js        Cotizacion del dolar (con cache)
  repository.js   Consultas a la base
  summary.js      Calculos del dashboard
  api.test.js     Tests de la API
shared/           Codigo compartido front/back (catalogo y validaciones)
src/
  components/     Componentes de la app y UI (shadcn/ui)
  context/        Providers (idioma, notificaciones)
  hooks/          Hooks personalizados
  i18n/           Traducciones es / en
  layouts/        Layout principal (sidebar + navbar)
  lib/            Cliente de la API y formateo
  pages/          Dashboard, Historial, 404
```

## Autor

Proyecto desarrollado por [bgastong](https://github.com/bgastong).
