# bolsillox

bolsillox es una aplicacion web para registrar y visualizar tus finanzas personales: ingresos, gastos, saldo, graficos y un historial con filtros. Es una app de un solo usuario (sin login) con frontend en React y una API REST en Node + Express + SQLite.

## Funcionalidades

- **Movimientos (CRUD):** crear, editar y eliminar ingresos y gastos desde un formulario en un dialogo.
- **Validaciones en front y back:** el mismo schema de [zod](https://zod.dev) (`shared/movementSchema.js`) valida el formulario y la API. Titulo requerido, monto mayor a 0, fecha valida, categoria acorde al tipo y metodo de pago de la lista. Los errores se muestran traducidos.
- **Dashboard:** saldo acumulado, ingresos y gastos del mes con variacion contra el mes anterior, tasa de ahorro, grafico de ingresos vs. gastos (ultimos 6 meses), gastos por categoria y ultimos movimientos. Se puede navegar entre meses.
- **Historial:** busqueda por texto, filtros por tipo, categoria, metodo de pago y rango de fechas, y orden por fecha, monto o titulo. Los filtros quedan en la URL.
- **Idiomas:** espanol / ingles (se recuerda la eleccion). Montos en ARS con `Intl.NumberFormat` y fechas segun el idioma.
- **Estados de carga, error y vacio**, notificaciones al guardar y diseno responsive (tabla en escritorio, tarjetas en mobile).

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

### Variables de entorno (opcionales)

| Variable | Default | Uso |
| --- | --- | --- |
| `PORT` | `3001` | Puerto de la API |
| `DB_PATH` | `server/data/bolsillox.db` | Archivo SQLite |
| `VITE_API_PROXY` | `http://localhost:3001` | Destino del proxy `/api` de Vite |

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
| `GET` | `/summary?month=YYYY-MM` | Resumen del mes (saldo, totales, variacion, por categoria, ultimos 6 meses, ultimos movimientos) |

Cuerpo de un movimiento:

```json
{
  "type": "expense",
  "title": "Supermercado",
  "amount": 24500,
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
  db.js           Conexion, esquema y datos de ejemplo
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
