// Traduce un error de la API de cuentas a una clave de traduccion.
export function authErrorKey(error) {
  switch (error?.code) {
    case "invalid_credentials":
      return "errorInvalidCredentials";
    case "too_many_attempts":
      return "errorTooManyAttempts";
    case "code_invalid":
      return "errorCodeWrong";
    case "code_expired":
      return "errorCodeExpired";
    case "code_cooldown":
      return "errorCodeCooldown";
    case "wrong_password":
      return "errorWrongPassword";
    case "email_taken":
      return "errorEmailTaken";
    case "email_same":
      return "errorEmailSame";
    case "email_disabled":
      return "errorEmailDisabled";
    case "network_error":
      return "errorServer";
    default:
      return "errorGeneric";
  }
}
