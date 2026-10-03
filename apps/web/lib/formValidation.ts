import { FormEvent } from "react";

type ValidatableElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Handler para o evento nativo `onInvalid`: troca a mensagem padrão do
 * browser (em inglês) por uma mensagem em português, sem mudar o
 * comportamento de validação nativa (required, type="email", etc).
 */
export function ptBRValidity(e: FormEvent<ValidatableElement>) {
  const el = e.currentTarget;
  if (el.validity.valueMissing) {
    el.setCustomValidity("Preencha este campo.");
  } else if (el.validity.typeMismatch && el.type === "email") {
    el.setCustomValidity("Digite um e-mail válido.");
  } else if (el.validity.patternMismatch) {
    el.setCustomValidity("Formato inválido.");
  } else {
    el.setCustomValidity("Valor inválido.");
  }
}

/** Limpa a mensagem customizada a cada digitação, senão o campo fica "preso" como inválido. */
export function clearValidity(e: FormEvent<ValidatableElement>) {
  e.currentTarget.setCustomValidity("");
}