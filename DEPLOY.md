# Subir bolsillox a internet (gratis)

La app queda en una dirección como `https://bolsillox.onrender.com`, cada persona crea su cuenta y sus datos se guardan en una base Postgres en la nube.

- **Render** ejecuta el servidor (la API y la web juntas). El plan gratis no pide tarjeta.
- **Neon** guarda la base de datos Postgres. El plan gratis tampoco pide tarjeta.

> **Plan gratis de Render:** si nadie usa la app durante 15 minutos, el servidor se duerme. La siguiente visita tarda entre 30 y 60 segundos en cargar; después anda normal. Si más adelante querés que responda siempre al instante, pasás al plan pago desde el panel de Render. No hay que cambiar código.

Antes de empezar, mergeá el PR a `master`: Render publica lo que hay en esa rama.

## 1. Base de datos en Neon

1. Entrá a [neon.tech](https://neon.tech) y creá una cuenta. Podés usar tu cuenta de GitHub.
2. Creá un proyecto:
   - **Name:** `bolsillox`
   - **Region:** AWS **US East (N. Virginia)**. Tiene que ser la misma zona que el servidor de Render.
3. En el panel del proyecto, tocá **Connect** y copiá la **connection string**. Empieza con `postgresql://` y termina con `?sslmode=require`.

Guardala, la vas a usar en el paso 2. Es la contraseña de tu base: no la subas al repo ni la compartas.

No hace falta crear tablas: la app las crea sola la primera vez que arranca.

## 2. Servidor en Render

1. Entrá a [render.com](https://render.com) y creá una cuenta con GitHub.
2. Tocá **New → Blueprint** y elegí el repositorio `bgastong/bolsillox`. Render lee el archivo `render.yaml` y arma el servicio solo.
3. Te va a pedir las variables de entorno:
   - **DATABASE_URL:** la connection string de Neon.
   - **PUBLIC_URL:** dejala vacía por ahora.
   - **GOOGLE_CLIENT_ID** y **GOOGLE_CLIENT_SECRET:** vacías por ahora (el paso 4 es opcional).
4. Tocá **Apply**. El primer deploy tarda unos minutos. Al terminar, arriba aparece la dirección de tu app, por ejemplo `https://bolsillox.onrender.com`.
5. Volvé a **Environment**, completá **PUBLIC_URL** con esa dirección (sin `/` al final) y guardá. Render vuelve a publicar solo.

Cada vez que se mergea algo a `master`, Render publica la versión nueva automáticamente.

## 3. Crear tu cuenta

Abrí la dirección de la app, tocá **Crear cuenta** y listo.

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
   El email tiene que ser el de la cuenta que creaste en el paso 3.

## 4. Login con Google (opcional)

1. Entrá a [console.cloud.google.com](https://console.cloud.google.com) y creá un proyecto (por ejemplo, `bolsillox`).
2. Buscá **Google Auth Platform** (o **APIs y servicios → Pantalla de consentimiento de OAuth**) y configurala:
   - **Nombre de la app:** bolsillox
   - **Correo de asistencia:** tu email
   - **Público:** Externo
3. En **Público** (Audience), tocá **Publicar app**. Si la dejás en modo "Prueba", solo pueden entrar los emails que agregues como usuarios de prueba. bolsillox solo pide nombre y email, que son permisos básicos.
4. En **Clientes** (Clients), tocá **Crear cliente**:
   - **Tipo:** Aplicación web
   - **URIs de redireccionamiento autorizados:** agregá estos dos:
     - `https://TU-APP.onrender.com/api/auth/google/callback`
     - `http://localhost:5173/api/auth/google/callback` (para probar en tu compu)
5. Copiá el **ID de cliente** y el **Secreto del cliente**.
6. En Render, en **Environment**, completá **GOOGLE_CLIENT_ID** y **GOOGLE_CLIENT_SECRET** y guardá.

Después del nuevo deploy aparece el botón **Continuar con Google** en el login y en el registro.

Para probarlo en tu compu, poné las mismas dos variables en tu `.env` y corré `npm run dev`.

## 5. Emails con código (verificación y recuperar contraseña)

Al crear una cuenta, bolsillox manda un código de 6 dígitos para confirmar el email. Lo mismo pasa con "¿Olvidaste tu contraseña?" y al cambiar el email. Los emails salen por **Resend**: el plan gratis alcanza (3.000 emails por mes) y funciona en el plan gratis de Render, que no permite enviar por SMTP.

1. Creá una cuenta en [resend.com](https://resend.com).
2. En **API Keys**, creá una clave con permiso **Sending access** y copiala. Empieza con `re_`.
3. En Render, en **Environment**, agregá **RESEND_API_KEY** con esa clave.
4. Para mandar desde tu propio dominio, por ejemplo `hola@tudominio.com`:
   - En Resend, entrá a **Domains**, agregá tu dominio y cargá en tu proveedor de dominio los registros DNS que te indica.
   - Cuando aparezca como verificado, agregá en Render **EMAIL_FROM** con el remitente. Por ejemplo: `bolsillox <hola@tudominio.com>`.

   Sin dominio propio, Resend solo deja mandar emails de prueba a tu propia dirección. Sirve para probar, pero no para usuarios reales.

Sin `RESEND_API_KEY` la app sigue funcionando: las cuentas nuevas entran sin código y "¿Olvidaste tu contraseña?" no aparece. En tu compu, sin la clave, el código se muestra en la terminal de `npm run dev`.

Las cuentas creadas antes de activar esto no tienen que confirmar nada.

## 6. Términos y privacidad

Los textos están en `src/lib/legalContent.js`. Antes de publicar:

1. Completá tus datos en `OWNER`: nombre o razón social, CUIT/CUIL, domicilio, email de contacto y ciudad.
2. Hacelos revisar por un abogado.
3. Si después cambiás los textos, actualizá la fecha en `shared/legal.js`. Cada persona queda registrada con la versión que aceptó.

## Problemas comunes

| Qué pasa | Qué revisar |
| --- | --- |
| El build falla con `Cannot find package '@vitejs/plugin-react'` | Que el Build Command sea `npm ci --include=dev && npm run build`. |
| La primera carga tarda mucho | Es el servidor gratis despertándose; esperá hasta un minuto. |
| El deploy falla al arrancar con un error de base de datos | Que `DATABASE_URL` sea la connection string completa de Neon, con `?sslmode=require`. |
| Google dice `redirect_uri_mismatch` | Que la URI cargada en Google sea exactamente `PUBLIC_URL` + `/api/auth/google/callback`. |
| Google vuelve al login con un error | Que `PUBLIC_URL` esté completa y que la app de Google esté publicada (o tu email agregado como usuario de prueba). |
| No aparece el botón de Google | Que estén cargadas las dos variables `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`. |
| No llegan los códigos por email | Que `RESEND_API_KEY` esté cargada y que el dominio de `EMAIL_FROM` esté verificado en Resend. Revisá los logs de Render: ahí aparece el error de Resend. También fijate en spam. |
