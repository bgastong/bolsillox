import { TERMS_VERSION } from "@shared/legal.js";

/*
Textos legales de bolsillox (Argentina): Terminos y condiciones y Politica
de privacidad. Estan en español, el idioma del servicio.

IMPORTANTE: completar los datos del responsable (OWNER) antes de publicar y
hacer revisar los textos por un abogado. Si se cambian, actualizar
TERMS_VERSION en shared/legal.js con la fecha del cambio.
*/
export const OWNER = {
  name: "[NOMBRE Y APELLIDO O RAZÓN SOCIAL DEL RESPONSABLE]",
  id: "[CUIT/CUIL]",
  address: "[DOMICILIO]",
  email: "[EMAIL DE CONTACTO]",
  city: "[CIUDAD], [PROVINCIA]",
};

export const LEGAL_UPDATED = TERMS_VERSION;

// Cada seccion: { id, title, blocks }. Un bloque es un parrafo (string) o
// una lista ({ list: [...] }).
export const TERMS = [
  {
    id: "aceptacion",
    title: "1. Aceptación",
    blocks: [
      `Estos Términos y condiciones regulan el uso de bolsillox (el "Servicio"), ofrecido por ${OWNER.name} (${OWNER.id}), con domicilio en ${OWNER.address} (el "Responsable").`,
      "Al crear una cuenta, ya sea con email o con Google, declarás haber leído y aceptado estos Términos y la Política de privacidad. Si no estás de acuerdo, no uses el Servicio.",
    ],
  },
  {
    id: "servicio",
    title: "2. Qué es bolsillox",
    blocks: [
      "bolsillox es una herramienta gratuita para registrar y organizar tus ingresos y gastos personales: movimientos, presupuestos, movimientos recurrentes y resúmenes.",
      "bolsillox no es un banco, una billetera virtual, una entidad financiera ni un asesor. No mueve dinero, no se conecta con tus cuentas bancarias y no realiza pagos ni inversiones. Toda la información la cargás vos.",
    ],
  },
  {
    id: "cuenta",
    title: "3. Tu cuenta",
    blocks: [
      {
        list: [
          "Tenés que ser mayor de 18 años o contar con la autorización de tus padres o tutores.",
          "Los datos que cargás al registrarte tienen que ser verdaderos, y el email tiene que ser tuyo: lo confirmamos con un código.",
          "Sos responsable de cuidar tu contraseña y de la actividad de tu cuenta. Si sospechás un acceso indebido, cambiá la contraseña y avisanos.",
          "La cuenta es personal e intransferible.",
        ],
      },
    ],
  },
  {
    id: "uso",
    title: "4. Uso permitido",
    blocks: [
      "Te comprometés a usar el Servicio de buena fe y conforme a la ley. En particular, no está permitido:",
      {
        list: [
          "usarlo para actividades ilícitas o para registrar operaciones con fines fraudulentos;",
          "intentar acceder a cuentas o datos de otras personas, o vulnerar la seguridad del Servicio;",
          "sobrecargarlo con pedidos automatizados o abusivos;",
          "cargar en notas o títulos contenido ilícito, ofensivo o que infrinja derechos de terceros.",
        ],
      },
    ],
  },
  {
    id: "informacion",
    title: "5. La información no es asesoramiento",
    blocks: [
      "Los totales, gráficos, presupuestos, variaciones y proyecciones se calculan con los datos que cargás y son solo informativos. No constituyen asesoramiento financiero, contable, impositivo ni de inversión.",
      "Las cotizaciones del dólar se obtienen de fuentes de terceros (por ejemplo, dolarapi.com) y pueden tener demoras o errores. Antes de tomar una decisión económica, verificá la información con fuentes oficiales o con un profesional.",
    ],
  },
  {
    id: "datos",
    title: "6. Tus datos son tuyos",
    blocks: [
      "Los movimientos y demás información que cargás te pertenecen. Nos autorizás a guardarlos y procesarlos únicamente para prestarte el Servicio. No los vendemos ni los usamos para publicidad.",
      "Podés borrar tu cuenta cuando quieras desde Ajustes: se eliminan tu cuenta y todos sus datos. El detalle de cómo tratamos tu información está en la Política de privacidad.",
    ],
  },
  {
    id: "disponibilidad",
    title: "7. Servicio gratuito y disponibilidad",
    blocks: [
      'El Servicio es gratuito y se ofrece "tal como está". Hacemos lo posible para que funcione bien, pero puede tener interrupciones, demoras (por ejemplo, el servidor puede tardar en responder después de un tiempo sin uso) o errores.',
      "Podemos agregar, cambiar o discontinuar funciones. Si decidimos dar de baja el Servicio, lo avisaremos con una anticipación razonable.",
    ],
  },
  {
    id: "responsabilidad",
    title: "8. Responsabilidad",
    blocks: [
      "En la medida permitida por la ley, el Responsable no será responsable por decisiones que tomes en base a la información del Servicio, por errores en los datos cargados por vos o provistos por terceros, ni por interrupciones o pérdidas de información causadas por hechos ajenos a su control.",
      "Nada de lo dispuesto en estos Términos limita los derechos que te reconoce la Ley 24.240 de Defensa del Consumidor ni otras normas de orden público.",
    ],
  },
  {
    id: "propiedad",
    title: "9. Propiedad intelectual",
    blocks: [
      "El nombre bolsillox, su logo y el diseño del Servicio pertenecen al Responsable. El código fuente es público en GitHub; salvo que el repositorio indique expresamente una licencia, su publicación no otorga permiso de uso, copia ni distribución.",
    ],
  },
  {
    id: "baja",
    title: "10. Baja y suspensión",
    blocks: [
      "Podés dar de baja tu cuenta en cualquier momento desde Ajustes, sin costo.",
      "Podemos suspender o cancelar cuentas que incumplan estos Términos o que pongan en riesgo la seguridad del Servicio o de otras personas.",
    ],
  },
  {
    id: "cambios",
    title: "11. Cambios en los Términos",
    blocks: [
      "Si modificamos estos Términos, actualizaremos la fecha de esta página y, si el cambio es importante, te avisaremos en la app o por email. Si seguís usando el Servicio después del cambio, se entiende que lo aceptás; si no estás de acuerdo, podés borrar tu cuenta.",
    ],
  },
  {
    id: "ley",
    title: "12. Ley aplicable y jurisdicción",
    blocks: [
      `Estos Términos se rigen por las leyes de la República Argentina. Ante cualquier conflicto serán competentes los tribunales ordinarios de ${OWNER.city}, sin perjuicio de tu derecho, como consumidor, a recurrir a los tribunales de tu domicilio (art. 36 de la Ley 24.240).`,
    ],
  },
  {
    id: "contacto",
    title: "13. Contacto",
    blocks: [`Por consultas o reclamos escribinos a ${OWNER.email}.`],
  },
];

export const PRIVACY = [
  {
    id: "responsable",
    title: "1. Quién es responsable de tus datos",
    blocks: [
      `El responsable de la base de datos es ${OWNER.name} (${OWNER.id}), con domicilio en ${OWNER.address}. Podés contactarnos en ${OWNER.email}.`,
      "Tratamos tus datos personales conforme a la Ley 25.326 de Protección de los Datos Personales y sus normas complementarias.",
    ],
  },
  {
    id: "datos",
    title: "2. Qué datos guardamos",
    blocks: [
      {
        list: [
          "Datos de la cuenta: nombre, email, contraseña (guardada con un hash irreversible, nunca en texto plano) y, si entrás con Google, el identificador de tu cuenta de Google.",
          "La información que cargás: movimientos (título, monto, moneda, fecha, categoría, medio de pago y notas), presupuestos, movimientos recurrentes y preferencias (moneda y cotización).",
          "Datos técnicos de seguridad: la fecha en que aceptaste estos documentos, las sesiones abiertas y, temporalmente, la dirección IP para limitar intentos de acceso.",
        ],
      },
      "No te pedimos datos bancarios, números de tarjeta ni claves de tus cuentas, y no recolectamos datos sensibles. Te recomendamos no cargarlos en las notas.",
    ],
  },
  {
    id: "finalidad",
    title: "3. Para qué los usamos",
    blocks: [
      {
        list: [
          "Prestarte el Servicio: guardar tus movimientos y mostrarte resúmenes y gráficos.",
          "Mantener tu cuenta segura: confirmar tu email, recuperar la contraseña y prevenir accesos indebidos.",
          "Enviarte emails necesarios para usar el Servicio (por ejemplo, códigos de verificación). No enviamos publicidad.",
        ],
      },
      "No vendemos, alquilamos ni cedemos tus datos, y no los usamos para armar perfiles comerciales ni para publicidad.",
      "Tratamos tus datos con tu consentimiento, que nos das al crear la cuenta (art. 5 de la Ley 25.326). Podés revocarlo en cualquier momento borrando tu cuenta.",
    ],
  },
  {
    id: "proveedores",
    title: "4. Con quién los compartimos",
    blocks: [
      "Para funcionar, el Servicio usa proveedores que procesan datos solo por nuestra cuenta y siguiendo nuestras instrucciones:",
      {
        list: [
          "Vercel (alojamiento de la web y del servidor).",
          "Neon (base de datos).",
          "Resend (envío de emails con códigos).",
          "Google, solo si elegís entrar con tu cuenta de Google.",
        ],
      },
      "Estos proveedores pueden almacenar datos en servidores ubicados fuera de la Argentina, como en los Estados Unidos. Al aceptar esta Política consentís esa transferencia internacional (art. 12 de la Ley 25.326). Exigimos que traten tus datos con medidas de seguridad adecuadas.",
      "Para las cotizaciones del dólar consultamos dolarapi.com, pero no le enviamos ningún dato tuyo.",
      "Solo entregaremos datos a una autoridad cuando una ley o una orden judicial lo exijan.",
    ],
  },
  {
    id: "conservacion",
    title: "5. Cuánto tiempo los guardamos",
    blocks: [
      "Guardamos tus datos mientras tengas la cuenta. Si la borrás, se eliminan de inmediato de nuestra base de datos. Las copias de seguridad de nuestros proveedores se eliminan según sus propios plazos, que suelen ser de pocos días.",
      "Los códigos enviados por email vencen a los 15 minutos y se borran al usarlos.",
    ],
  },
  {
    id: "seguridad",
    title: "6. Cómo los protegemos",
    blocks: [
      "Usamos conexiones cifradas (HTTPS), contraseñas con hash, sesiones en cookies que el código de la página no puede leer, códigos de un solo uso y límites de intentos. Ningún sistema es completamente seguro, pero trabajamos para proteger tu información y te avisaremos si detectamos un incidente que la afecte.",
    ],
  },
  {
    id: "derechos",
    title: "7. Tus derechos",
    blocks: [
      "Podés ejercer en cualquier momento tus derechos de acceso, rectificación, actualización y supresión de tus datos:",
      {
        list: [
          "Rectificación y actualización: cambiá tu nombre, email o contraseña desde Ajustes, y editá o borrá cualquier movimiento.",
          "Supresión: borrá tu cuenta desde Ajustes y se eliminan todos tus datos.",
          `Acceso o cualquier otra consulta: escribinos a ${OWNER.email}.`,
        ],
      },
      "El derecho de acceso es gratuito si lo ejercés en intervalos no menores a seis meses, salvo que acredites un interés legítimo (art. 14, inc. 3, de la Ley 25.326). Respondemos los pedidos de acceso dentro de los 10 días corridos y los de rectificación o supresión dentro de los 5 días hábiles.",
      "La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.",
    ],
  },
  {
    id: "cookies",
    title: "8. Cookies y almacenamiento del navegador",
    blocks: [
      "Usamos solo lo indispensable para que el Servicio funcione. No usamos cookies de publicidad ni de analítica.",
      {
        list: [
          "Una cookie de sesión (bx_session), para mantenerte con la sesión iniciada. Dura hasta 30 días o hasta que cierres sesión.",
          "Una cookie temporal durante el inicio de sesión con Google, que se borra al terminar.",
          "El almacenamiento local de tu navegador, para recordar el idioma y el tema que elegiste.",
        ],
      },
    ],
  },
  {
    id: "menores",
    title: "9. Menores de edad",
    blocks: [
      "El Servicio está pensado para mayores de 18 años. Los menores solo pueden usarlo con la autorización de sus padres o tutores.",
    ],
  },
  {
    id: "cambios",
    title: "10. Cambios en esta Política",
    blocks: [
      "Si la modificamos, actualizaremos la fecha de esta página y, si el cambio es importante, te avisaremos en la app o por email.",
    ],
  },
  {
    id: "contacto",
    title: "11. Contacto",
    blocks: [`Por cualquier consulta sobre tus datos escribinos a ${OWNER.email}.`],
  },
];
