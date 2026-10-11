type DbErrorLike = { code?: string | null; message?: string };

export function friendlyDbError(error: DbErrorLike | null | undefined, fallback: string): string {
  console.error("db_error", error?.code);

  switch (error?.code) {
    case "23505":
      return "Já existe um registro com esses dados.";
    case "23503":
      return "Este registro está vinculado a outros dados e não pode ser alterado ou excluído.";
    case "23P01":
      return "Este horário já está ocupado para o profissional.";
    case "23502":
    case "23514":
    case "22P02":
    case "22003":
      return "Dados inválidos. Revise os campos e tente novamente.";
    case "42501":
      return "Você não tem permissão para esta ação.";
    case "P0001":
      return error.message || fallback;
    default:
      return fallback;
  }
}

export function friendlyAuthError(error: { code?: string | null } | null | undefined, fallback: string): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar.";
    case "user_already_exists":
    case "email_exists":
      return "Este e-mail já possui cadastro.";
    case "weak_password":
      return "Senha fraca. Use pelo menos 8 caracteres.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Muitas tentativas. Aguarde alguns minutos.";
    case "same_password":
      return "A nova senha deve ser diferente da atual.";
    default:
      return fallback;
  }
}