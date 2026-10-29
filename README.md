# bolsillox

App web para llevar tus finanzas personales: cargás ingresos y gastos en pesos o en dólares y ves a dónde se te va la plata. Funciona en la compu y se instala en el celular.

👉 [bolsillox.com.ar](https://bolsillox.com.ar)

## Qué se puede hacer

- Cargar ingresos y gastos en pesos o dólares, con la cotización del día (oficial, blue o MEP).
- Ver el saldo, el flujo de caja y los gastos por categoría, mes a mes.
- Buscar y filtrar el historial, y exportarlo a CSV o Excel.
- Cargar una sola vez lo que se repite todos los meses (sueldo, alquiler, suscripciones).
- Ponerle un tope mensual a cada categoría.
- Armar metas de ahorro y saber cuánto separar por mes.
- Llevar deudas, compras en cuotas, gastos compartidos y lo que te deben.
- Seguir inversiones indexadas al S&P 500 y ver el dólar histórico por gobierno.
- Recibir por email un aviso antes de que venza una cuota.
- Usarla en español o en inglés, con tema claro u oscuro.

Cada persona tiene su cuenta (email y contraseña o Google) y solo ve sus datos.

## Tecnologías

- **Frontend:** React 19, Vite, React Router, Tailwind CSS 4, shadcn/ui, Chart.js.
- **Backend:** Node.js, Express 5, Postgres, zod (las mismas validaciones en el front y en la API).
- **Base de datos:** Postgres en Neon. En desarrollo y en los tests se usa [PGlite](https://pglite.dev), así que no hace falta instalar Postgres.
- **Deploy:** Vercel. Los emails salen por Resend.

## Cómo correrlo

Hace falta Node.js 22.12 o superior.

```bash
npm install
npm run dev
```

Abrí http://localhost:5173. La primera vez se crea una base local con una cuenta de prueba que ya tiene datos:

- Email: `demo@bolsillox.app`
- Contraseña: `demo1234`

Para empezar de cero, borrá la carpeta `server/data/pglite/`.

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Levanta la API (puerto 3001) y el frontend (puerto 5173) |
| `npm test` | Tests de la API y del frontend |
| `npm run lint` | ESLint |
| `npm run build` | Build de producción en `dist/` |
| `npm start` | Sirve la API y el build en http://localhost:3001 |

El CI corre lint, tests y build en cada pull request, y repite los tests contra un Postgres real.

## Configuración

Todo es opcional: sin variables, la app anda en tu compu con la base local. Para configurarla, copiá `.env.example` como `.env`; ahí está explicada cada variable. Para subirla a internet, seguí [DEPLOY.md](DEPLOY.md).

## Licencia

Código abierto bajo la [licencia MIT](LICENSE).

Hecho por [Gastón Berhau](https://github.com/bgastong).
