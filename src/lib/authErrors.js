// Traduce un error de la API de cuentas a una clave de traduccion.
export function authErrorKey(error) {
  switch (error?.code) {
    case "invalid_credentials":
      return "errorInvalidCredentials";
    case "too_many_attempts":
      return "errorTooManyAttempts";
    case "network_error":
      return "errorServer";
    default:
      return "errorGeneric";
  }
}
