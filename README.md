# bolsillox

bolsillox es una aplicacion web para registrar y visualizar tus finanzas personales: ingresos, gastos, saldo, graficos y un historial con filtros. Cada persona tiene su cuenta (email y contraseña o Google) y ve solo sus datos. El frontend es React y la API es REST con Node + Express + Postgres. Para subirla a internet gratis, ver [DEPLOY.md](DEPLOY.md).

## Funcionalidades

- **Cuentas:** registro e inicio de sesion con email y contraseña o con Google. Al registrarse se confirma el email con un codigo de 6 digitos (Resend); con un codigo tambien se recupera la contraseña y se cambia el email. Desde Ajustes se pueden cambiar nombre, email y contraseña. Sesion en una cookie `httpOnly` (30 dias), contraseñas con scrypt, limite de intentos, proteccion CSRF y opcion de borrar la cuenta con todos sus datos. Las cuentas nuevas arrancan vacias y pueden cargar datos de ejemplo con un boton.
- **Movimientos (CRUD):** crear, editar y eliminar ingresos y gastos desde un formulario en un dialogo.
- **Validaciones en front y back:** el mismo schema de [zod](https://zod.dev) (`shared/movementSchema.js`) valida el formulario y la API. Titulo requerido, monto mayor a 0, fecha valida, categoria acorde al tipo y metodo de pago de la lista. Los errores se muestran traducidos.
- **Dashboard:** saldo acumulado, ingresos y gastos del mes con variacion contra el mes anterior y tendencia de 6 meses, cuanto se gasto y ahorro de lo que entro, flujo de caja (ultimos 6 meses), gastos por categoria con su variacion, actividad reciente agrupada por dia, presupuestos, proximos vencimientos y cotizacion del dolar. Se puede navegar entre meses.
- **Buscador (⌘K / Ctrl+K):** busca movimientos, crea uno nuevo o salta a cualquier pantalla con el teclado. `N` abre un movimiento nuevo.
- **Historial:** busqueda por texto, filtros por tipo, categoria, metodo de pago y rango de fechas, y orden por fecha, monto o titulo. Los filtros quedan en la URL.
- **Pesos y dolares:** cada movimiento puede ser en ARS o USD. La cotizacion (oficial, blue o MEP) se toma de [dolarapi.com](https://dolarapi.com), se guarda en cache 30 minutos y, si la API no responde, se usa el ultimo valor o una cotizacion manual. Los totales se pueden ver en pesos o en dolares.
- **Recurrentes:** el sueldo, el alquiler o las suscripciones se cargan una vez ("se repite todos los meses") y se generan solos el dia indicado. Se pueden pausar, editar o darles fecha de fin; si borras un movimiento generado, no se vuelve a crear.
- **Presupuestos:** tope mensual (en pesos) por categoria de gasto, con barra de progreso, estado ("vas bien", "cerca del limite", "te pasaste") y aviso al cargar un gasto que te acerca o te pasa del tope.
- **Ajustes:** cuenta (cerrar sesion, borrar cuenta), moneda de los totales, fuente de la cotizacion, idioma y enlace al repositorio.
- **Idiomas:** espanol / ingles (se recuerda la eleccion). Montos en ARS con `Intl.NumberFormat` y fechas segun el idioma.
- **Pensada para el celular:** navegacion inferior con boton "+" para cargar desde cualquier pantalla, formularios como hoja inferior con botones siempre visibles, areas tactiles de 44px, inputs de 16px (sin zoom en iOS), filas que se tocan enteras para editar y soporte de zonas seguras (notch). Se puede agregar a la pantalla de inicio (manifest).
- **Accesibilidad:** sin violaciones en axe-core (WCAG 2.1 AA), enlace "saltar al contenido", foco visible, anuncios para lectores de pantalla, tabla alternativa para el grafico, categorias identificadas por icono + nombre, montos con signo (no solo color) y respeto de "reducir movimiento".
- **Legal:** Terminos y condiciones y Politica de privacidad (Ley 25.326), aceptacion obligatoria al registrarse con fecha y version guardadas.
- **Estados de carga, error y vacio** y notificaciones al guardar.

## Tecnologias

- **Frontend:** React 19, Vite, React Router, Tailwind CSS 4, shadcn/ui (Radix UI), Chart.js, lucide-react. Fuentes Geist y Geist Mono (empaquetadas con Fontsource).
- **Backend:** Node.js, Express 5, Postgres (`pg`; en desarrollo y tests, [PGlite](https://pglite.dev): Postgres embebido, sin instalar nada), zod.
- **Calidad:** ESLint, tests de la API con `node:test` (contra PGlite y contra Postgres 16 en el CI).

## Requisitos

- Node.js **22.12 o superior**. No hace falta instalar Postgres para desarrollar.

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

La primera vez se crea la base local en `server/data/pglite/` con una cuenta de prueba que ya tiene datos de ejemplo:

- Email: `demo@bolsillox.app`
- Contraseña: `demo1234`

Tambien podes crear tu propia cuenta desde "Crear cuenta". Para empezar de cero, borra la carpeta `server/data/pglite/`.

### Traer los datos de la version anterior

Si usabas bolsillox antes de que tuviera cuentas, tus datos estan en `server/data/bolsillox.db`. Creá tu cuenta en la app y despues:

```bash
npm run import:sqlite -- --email tu@email.com
```

Con `DATABASE_URL` en el `.env` los importa a ese Postgres (por ejemplo, el de produccion).

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
| `npm run import:sqlite -- --email ...` | Importa la base SQLite de la version anterior a una cuenta |
| `npm run lint` | ESLint |

El CI de GitHub Actions corre lint, tests y build en cada pull request (Node 22 y 24), y repite los tests contra un Postgres 16 real.

### Variables de entorno (opcionales)

Se pueden poner en un archivo `.env` (ver `.env.example`).

| Variable | Default | Uso |
| --- | --- | --- |
| `PORT` | `3001` | Puerto de la API |
| `DATABASE_URL` | (vacio) | Postgres de produccion. Sin ella se usa PGlite |
| `PGLITE_DIR` | `server/data/pglite` | Carpeta de la base local |
| `PUBLIC_URL` | (vacio) | URL publica, para la vuelta del login con Google |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | (vacio) | Activan "Continuar con Google" |
| `VITE_API_PROXY` | `http://localhost:3001` | Destino del proxy `/api` de Vite |
| `RATES_URL` | `https://dolarapi.com/v1/dolares` | API de cotizaciones (para usar un mock en desarrollo) |

## API

Base: `/api`. Todas las respuestas son JSON. Salvo `/health` y `/auth/*`, todas las rutas requieren sesion (si no, `401`) y trabajan solo con los datos del usuario.

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `GET` | `/health` | Estado del servidor |
| `POST` | `/auth/register` | Crea la cuenta (`name`, `email`, `password`) e inicia sesion |
| `POST` | `/auth/login` | Inicia sesion (`email`, `password`) |
| `POST` | `/auth/logout` | Cierra la sesion |
| `GET` | `/auth/me` | Usuario de la sesion |
| `GET` | `/auth/config` | `{ google: true/false }` |
| `GET` | `/auth/google` | Redirige al login de Google (vuelve a `/auth/google/callback`) |
| `DELETE` | `/auth/account` | Borra la cuenta y sus datos (`email` como confirmacion) |
| `POST` | `/demo-data` | Carga datos de ejemplo en una cuenta vacia |
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
server/           API REST (Express + Postgres)
  app.js          Rutas y middlewares
  auth.js         Contraseñas, sesiones y cookies
  google.js       Login con Google (OAuth con PKCE)
  db.js           Conexion (pg o PGlite), migraciones y datos de ejemplo
  sql.js          Consultas con parametros (sql`...`)
  recurring.js    Generacion de movimientos recurrentes
  budgets.js      Presupuestos por categoria
  rates.js        Cotizacion del dolar (con cache)
  repository.js   Consultas a la base
  summary.js      Calculos del dashboard
  scripts/        Importar la base de la version anterior
  *.test.js       Tests de la API
shared/           Codigo compartido front/back (catalogo y validaciones)
src/
  components/     Componentes de la app y UI (shadcn/ui)
  context/        Providers (sesion, idioma, ajustes, notificaciones)
  hooks/          Hooks personalizados
  i18n/           Traducciones es / en
  layouts/        Layout principal (sidebar + navbar)
  lib/            Cliente de la API y formateo
  pages/          Login, registro, Dashboard, Historial, Recurrentes, Presupuestos, Ajustes, 404
```

## Autor

Proyecto desarrollado por [bgastong](https://github.com/bgastong).
