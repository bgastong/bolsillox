import { useRef, useState } from "react";
import { issuesToFieldErrors } from "@shared/movementSchema.js";
import { authErrorKey } from "@/lib/authErrors";

/*
Logica comun de los formularios de login y registro:
- valida cada campo al salir (si ya se escribio algo) y todo al enviar,
- al corregir un campo con error, el error se va mientras se escribe,
- enfoca el primer campo con error,
- traduce los errores de la API (onSubmit puede devolver errores por campo).
*/
export function useAuthForm({ schema, initialValues, onSubmit, initialFormError = null }) {
  const formRef = useRef(null);
  const fields = Object.keys(initialValues);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(initialFormError);
  const [submitting, setSubmitting] = useState(false);

  function fieldErrors(nextValues) {
    const result = schema.safeParse(nextValues);
    return result.success ? {} : issuesToFieldErrors(result.error.issues);
  }

  function focusFirst(nextErrors) {
    const first = fields.find((name) => nextErrors[name]);
    if (first) formRef.current?.elements.namedItem(first)?.focus();
  }

  function register(name) {
    return {
      name,
      value: values[name],
      error: errors[name],
      onChange(event) {
        const { type, checked, value } = event.target;
        const nextValues = { ...values, [name]: type === "checkbox" ? checked : value };
        setValues(nextValues);
        // Si el campo tenia error, se revalida en vivo para sacarlo al corregirlo.
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: fieldErrors(nextValues)[name] }));
      },
      onBlur() {
        if (!values[name]) return;
        setErrors((prev) => ({ ...prev, [name]: fieldErrors(values)[name] }));
      },
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    const result = schema.safeParse(values);
    if (!result.success) {
      const nextErrors = issuesToFieldErrors(result.error.issues);
      setErrors(nextErrors);
      focusFirst(nextErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(result.data);
    } catch (error) {
      setSubmitting(false);
      const apiFields = error.fieldErrors ?? (error.code === "validation_error" ? error.fields : null);
      if (apiFields) {
        setErrors(apiFields);
        focusFirst(apiFields);
      } else {
        setFormError(authErrorKey(error));
      }
    }
  }

  return { formRef, register, handleSubmit, formError, submitting };
}
