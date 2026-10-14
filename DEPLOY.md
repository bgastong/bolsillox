# Subir bolsillox a internet

La app queda en tu dominio (por ejemplo `https://bolsillox.com.ar`), cada persona crea su cuenta y sus datos se guardan en una base Postgres en la nube.

- **Vercel** publica la web y ejecuta la API. Siempre está activa: no se "duerme".
- **Neon** guarda la base de datos Postgres.
- **Resend** manda los emails con códigos (opcional).

> **Plan gratis de Vercel (Hobby):** es para proyectos personales, sin fines comerciales. Si cobrás o ponés publicidad, corresponde el plan Pro.

Vercel publica lo que hay en la rama `master`: mergeá los PRs antes de empezar.

## 1. Base de datos en Neon

Si ya tenés una base de Neon con datos, **usá esa misma**: tus cuentas y movimientos siguen ahí. Solo necesitás la URL "pooled" (punto 3).

1. Entrá a [neon.tech](https://neon.tech) y creá una cuenta. Podés usar tu cuenta de GitHub.
2. Creá un proyecto:
   - **Name:** `bolsillox`
   - **Region:** AWS **US East (N. Virginia)**. Es la misma zona donde corre la API en Vercel (`iad1`).
3. En el panel del proyecto, tocá **Connect**, activá **Connection pooling** y copiá la **connection string**. Empieza con `postgresql://`, el host tiene `-pooler` y termina con `?sslmode=require`.

Es la contraseña de tu base: no la subas al repo ni la compartas. No hace falta crear tablas: la app las crea sola.

## 2. Proyecto en Vercel

1. Entrá a [vercel.com](https://vercel.com) y creá una cuenta con GitHub (plan **Hobby**).
2. Tocá **Add New… → Project** e importá el repositorio `bgastong/bolsillox`. Si no aparece, tocá **Adjust GitHub App Permissions** y dale acceso.
3. Vercel lee `vercel.json` y completa solo la configuración (Vite, `npm run build`, carpeta `dist`). No cambies nada.
4. Abrí **Environment Variables** y cargá:

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_URL` | la connection string pooled de Neon |
   | `PG_POOL_MAX` | `2` |
   | `PUBLIC_URL` | `https://bolsillox.com.ar` (tu dominio, sin `/` al final) |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | si usás el login con Google (paso 5) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | si usás los códigos por email (paso 6) |
   | `ALERT_EMAIL` | tu email, para recibir avisos de errores (paso 7) |
   | `CRON_SECRET` | una clave larga al azar, para los recordatorios de cuotas (paso 7) |

5. Tocá **Deploy**. Tarda uno o dos minutos. Al terminar te da una dirección de prueba, por ejemplo `https://bolsillox.vercel.app`.

Mientras no conectes el dominio, el login con Google solo anda si `PUBLIC_URL` es la dirección en la que estás. El login con email anda en cualquiera.

Cada vez que se mergea algo a `master`, Vercel publica la versión nueva. Cada PR también recibe su propia dirección de prueba.

Si cambiás una variable, tenés que volver a publicar: **Deployments → ⋯ → Redeploy**.

## 3. Conectar tu dominio

1. En Vercel, entrá al proyecto → **Settings → Domains** y agregá `bolsillox.com.ar`. Vercel te ofrece sumar también `www.bolsillox.com.ar` y redirigirlo; aceptá.
2. Vercel te muestra qué cargar. Tenés dos opciones:
   - **Registros DNS** (lo más simple si el dominio está en NIC.ar con otro DNS): un registro **A** para `@` y un **CNAME** para `www`, con los valores que muestra Vercel.
   - **Nameservers de Vercel**: en NIC.ar, en **Delegaciones**, poné los nameservers que te indica Vercel (`ns1.vercel-dns.com` y `ns2.vercel-dns.com`). Así todo el DNS se maneja desde Vercel, incluidos los registros de Resend.
3. Esperá a que el dominio aparezca como **Valid Configuration**. Puede tardar desde minutos hasta algunas horas (NIC.ar a veces tarda más). El certificado HTTPS se genera solo.

## 4. Crear tu cuenta

Abrí tu dominio, tocá **Crear cuenta** y listo.

### Traer los datos que tenías en tu compu (opcional)

Si cargaste movimientos en la versión anterior (antes de que hubiera cuentas), están en `server/data/bolsillox.db`. Para pasarlos a tu cuenta nueva:

1. En la carpeta del proyecto, creá un archivo `.env` (ver `.env.example`) con:
   ```
   DATABASE_URL=la-connection-string-de-neon
   ```
2. Corré:
   ```bash
   npm run import:sqlite -- --email tu@email.com
   ```
   El email tiene que ser el de la cuenta que creaste.

## 5. Login con Google (opcional)

1. Entrá a [console.cloud.google.com](https://console.cloud.google.com) y creá un proyecto (por ejemplo, `bolsillox`).
2. Buscá **Google Auth Platform** (o **APIs y servicios → Pantalla de consentimiento de OAuth**) y configurala:
   - **Nombre de la app:** bolsillox
   - **Correo de asistencia:** tu email
   - **Público:** Externo
3. En **Público** (Audience), tocá **Publicar app**. Si la dejás en modo "Prueba", solo pueden entrar los emails que agregues como usuarios de prueba. bolsillox solo pide nombre y email, que son permisos básicos.
4. En **Clientes** (Clients), tocá **Crear cliente** (o abrí el que ya tenías):
   - **Tipo:** Aplicación web
   - **Orígenes de JavaScript autorizados:** `https://bolsillox.com.ar`
   - **URIs de redireccionamiento autorizados:**
     - `https://bolsillox.com.ar/api/auth/google/callback`
     - `http://localhost:5173/api/auth/google/callback` (para probar en tu compu)
5. Copiá el **ID de cliente** y el **Secreto del cliente** y cargalos en Vercel como `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`. Después, **Redeploy**.

Para probarlo en tu compu, poné las mismas dos variables en tu `.env` y corré `npm run dev`.

## 6. Emails con código (verificación y recuperar contraseña)

Al crear una cuenta, bolsillox manda un código de 6 dígitos para confirmar el email. Lo mismo pasa con "¿Olvidaste tu contraseña?" y al cambiar el email. Los emails salen por **Resend** (el plan gratis alcanza: 3.000 emails por mes).

> Cargá `RESEND_API_KEY` recién cuando el dominio esté verificado en Resend. Con la clave cargada la app pide el código a todos, y sin dominio verificado Resend solo le manda emails a tu propia dirección: nadie más podría crear una cuenta.

1. Creá una cuenta en [resend.com](https://resend.com).
2. En **Domains**, tocá **Add Domain** y agregá `bolsillox.com.ar` (o un subdominio, como `mail.bolsillox.com.ar`).
3. Cargá los registros DNS que te muestra Resend (MX y TXT) donde manejes el DNS: en Vercel (**Settings → Domains**, o la sección **Domains** de tu cuenta) si pusiste sus nameservers, o en tu proveedor si no.
4. Cuando todos aparezcan como **Verified**, entrá a **API Keys** y creá una clave con permiso **Sending access**. Empieza con `re_`; copiala, se muestra una sola vez.
5. En Vercel cargá:
   - `RESEND_API_KEY`: la clave.
   - `EMAIL_FROM`: el remitente, por ejemplo `bolsillox <no-reply@bolsillox.com.ar>`.
6. **Redeploy** y probá crear una cuenta en una ventana de incógnito.

Sin `RESEND_API_KEY` la app sigue funcionando: las cuentas nuevas entran sin código y "¿Olvidaste tu contraseña?" no aparece. En tu compu, sin la clave, el código se muestra en la terminal de `npm run dev`.

Las cuentas creadas antes de activar esto no tienen que confirmar nada.

## 7. Avisos de errores, recordatorios de cuotas y estadísticas

**Avisos de errores por email.** Si algo falla en el servidor (un error 500) o en la página, te llega un email con el detalle técnico. Usa el mismo Resend de los códigos.

1. En Vercel, cargá `ALERT_EMAIL` con tu email y hacé **Redeploy**.
2. El mismo error se avisa como mucho una vez por hora, y como mucho llegan 20 emails por hora.
3. Los avisos no incluyen lo que cargan las personas: solo la ruta, el id de usuario y el error. Sin `ALERT_EMAIL`, los errores quedan solo en **Vercel → Logs**.

**Estadísticas de visitas (Vercel Web Analytics).** Cuenta visitas por página, país y dispositivo, sin cookies.

1. En Vercel, abrí el proyecto → **Analytics** → **Enable**.
2. Con el próximo deploy empiezan a aparecer los datos en esa misma pestaña.

**Recordatorios de cuotas por email.** Cuando una cuota vence en 2 días, mañana, hoy o se venció sin pagar, la persona recibe un email (lo puede apagar en Ajustes → Avisos). Usa el mismo Resend de los códigos.

1. En Vercel, cargá `CRON_SECRET` con una clave larga al azar (por ejemplo, la que da `openssl rand -hex 32`) y hacé **Redeploy**.
2. `vercel.json` ya trae un **Cron Job** que todos los días a las 11:00 UTC (8:00 en Argentina) llama a `/api/cron/reminders` con esa clave. Lo ves en **Settings → Cron Jobs**.
3. Sin `CRON_SECRET` los recordatorios igual salen, pero solo cuando alguien usa la app (la revisión corre como mucho una vez por hora).

**Limpieza automática.** Cada 6 horas la app borra sola las cuentas que no confirmaron el email en 7 días, y las sesiones, códigos y límites de intentos vencidos. No hay que configurar nada.

## 8. Términos y privacidad

Los textos están en `src/lib/legalContent.js`. Antes de publicar:

1. Completá tus datos en `OWNER`: nombre o razón social, CUIT/CUIL, domicilio, email de contacto y ciudad.
2. Hacelos revisar por un abogado.
3. Si después cambiás los textos, actualizá la fecha en `shared/legal.js`. Cada persona queda registrada con la versión que aceptó.

## Problemas comunes

| Qué pasa | Qué revisar |
| --- | --- |
| La API responde error 500 y en los logs dice `Falta la variable DATABASE_URL` | Cargala en **Settings → Environment Variables** y hacé **Redeploy**. |
| Error de base de datos o `too many connections` | Que `DATABASE_URL` sea la URL **pooled** de Neon (host con `-pooler`) y que `PG_POOL_MAX` sea `2`. |
| Cambié una variable y no se nota | Las variables se aplican en el próximo deploy: **Deployments → ⋯ → Redeploy**. |
| El dominio dice "Invalid Configuration" | Revisá los registros A/CNAME o los nameservers en NIC.ar. A veces tarda unas horas. |
| Google dice `redirect_uri_mismatch` | Que la URI cargada en Google sea exactamente `PUBLIC_URL` + `/api/auth/google/callback`. |
| Google vuelve al login con un error | Que `PUBLIC_URL` sea tu dominio y que la app de Google esté publicada (o tu email agregado como usuario de prueba). |
| No aparece el botón de Google | Que estén cargadas las dos variables `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`. |
| No llegan los avisos de errores | Que `ALERT_EMAIL` y `RESEND_API_KEY` estén cargadas. Revisá spam. |
| No llegan los recordatorios de cuotas | Que `RESEND_API_KEY` y `CRON_SECRET` estén cargadas, que el Cron Job figure en **Settings → Cron Jobs** y que la persona no los haya apagado en Ajustes. Revisá spam. |
| No llegan los códigos por email | Que `RESEND_API_KEY` esté cargada y que el dominio de `EMAIL_FROM` esté verificado en Resend. En Vercel, **Logs** muestra el error de Resend; en Resend, **Emails** muestra cada envío. También fijate en spam. |
