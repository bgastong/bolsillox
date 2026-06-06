# bolsillox

bolsillox es una aplicacion web en desarrollo para visualizar y organizar informacion financiera personal. La idea del proyecto es construir un panel simple, claro y responsive para consultar saldos, rendimientos, gastos e historial desde una interfaz moderna.

## Estado del proyecto

El proyecto se encuentra en una etapa inicial de desarrollo. Actualmente cuenta con una base visual y estructural para el dashboard, navegacion lateral, barra superior, soporte de idiomas y componentes reutilizables.

Funcionalidades actuales:

- Layout principal con sidebar y navbar.
- Tarjeta de resumen financiero.
- Selector de idioma espanol/ingles.
- Estructura preparada para paginas como inicio e historial.
- Componentes UI reutilizables basados en React.

Pendiente o en progreso:

- Implementar rutas reales para las paginas.
- Completar la pantalla de historial.
- Agregar listado de gastos.
- Conectar datos dinamicos en lugar de valores fijos.
- Mejorar la documentacion funcional a medida que avance el producto.

## Tecnologias

- React
- Vite
- JavaScript
- CSS Modules
- Tailwind CSS
- Radix UI
- shadcn/ui
- i18next
- Chart.js
- ESLint

## Instalacion

Clonar el repositorio e instalar dependencias:

```bash
npm install
```

## Desarrollo

Levantar el servidor local:

```bash
npm run dev
```

Luego abrir la URL que indique Vite en la terminal.

## Scripts disponibles

```bash
npm run dev
```

Inicia el entorno de desarrollo.

```bash
npm run build
```

## Estructura principal

```text
src/
  components/     Componentes reutilizables y UI
  context/        Providers y contexto global
  data/           Datos mock del proyecto
  hooks/          Hooks personalizados
  i18n/           Traducciones
  layouts/        Layouts principales
  pages/          Paginas de la aplicacion
```

## Proximos pasos

- Definir el flujo principal de usuario.
- Crear la pantalla de historial.
- Agregar formularios para cargar ingresos y gastos.
- Preparar datos mock mas representativos.
- Incorporar graficos y resumenes financieros.
- Pulir responsive y accesibilidad.

## Autor

Proyecto desarrollado por [bgastong](https://github.com/bgastong).
