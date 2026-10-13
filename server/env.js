// Carga el archivo .env si existe (ver .env.example). Se importa primero que
// todo, asi las variables ya estan cuando los demas modulos las leen.
try {
  process.loadEnvFile();
} catch {
  // Sin .env: se usan las variables del sistema (como en Vercel).
}
