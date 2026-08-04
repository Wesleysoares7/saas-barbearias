"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAccessContext, isAdmin } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const COMPANY_LOGO_BUCKET = "company-logos";
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export type UpdateCompanyLogoActionState = {
  success: boolean;
  message: string;
};

export type UpdatePublicBookingSettingsActionState = {
  success: boolean;
  message: string;
};

function normalizePublicSlug(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeLogoUrl(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function getLogoFileExtension(file: File): string {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/jpeg") {
    return "jpg";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/svg+xml") {
    return "svg";
  }

  return "png";
}

export async function updateCompanyLogoAction(
  _previousState: UpdateCompanyLogoActionState,
  formData: FormData,
): Promise<UpdateCompanyLogoActionState> {
  const { supabase, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId || !role) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel validar sua sessao.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message: "Somente administradores podem alterar a logo da empresa.",
    };
  }

  const providedUrl = normalizeLogoUrl(formData.get("logoUrl"));
  const rawLogoFile = formData.get("logoFile");
  const logoFile = rawLogoFile instanceof File && rawLogoFile.size > 0 ? rawLogoFile : null;

  if (!providedUrl && !logoFile) {
    return {
      success: false,
      message: "Envie uma imagem ou informe a URL da logo.",
    };
  }

  let finalLogoUrl = providedUrl;

  if (logoFile) {
    if (!ALLOWED_LOGO_TYPES.has(logoFile.type)) {
      return {
        success: false,
        message: "Formato invalido. Use PNG, JPG, WEBP ou SVG.",
      };
    }

    if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
      return {
        success: false,
        message: "A imagem deve ter no maximo 2MB.",
      };
    }

    const fileExtension = getLogoFileExtension(logoFile);
    const logoPath = `${companyId}/logo-${Date.now()}.${fileExtension}`;
    const { error: uploadError } = await supabase.storage.from(COMPANY_LOGO_BUCKET).upload(logoPath, logoFile, {
      upsert: true,
      contentType: logoFile.type,
    });

    if (uploadError) {
      return {
        success: false,
        message: `Nao foi possivel enviar a imagem: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = supabase.storage.from(COMPANY_LOGO_BUCKET).getPublicUrl(logoPath);
    finalLogoUrl = publicUrlData.publicUrl;
  }

  const { error: companyUpdateError } = await supabase.from("companies").update({ logo: finalLogoUrl }).eq("id", companyId);

  if (companyUpdateError) {
    return {
      success: false,
      message: `Nao foi possivel salvar a logo da empresa: ${companyUpdateError.message}`,
    };
  }

  revalidatePath("/painel");

  return {
    success: true,
    message: "Logo da empresa atualizada com sucesso.",
  };
}

export async function updatePublicBookingSettingsAction(
  _previousState: UpdatePublicBookingSettingsActionState,
  formData: FormData,
): Promise<UpdatePublicBookingSettingsActionState> {
  const { supabase, companyId, role, errorMessage } = await getAccessContext();

  if (!companyId || !role) {
    return {
      success: false,
      message: errorMessage ?? "Nao foi possivel validar sua sessao.",
    };
  }

  if (!isAdmin(role)) {
    return {
      success: false,
      message: "Somente administradores podem alterar as configuracoes publicas.",
    };
  }

  const publicSlug = normalizePublicSlug(formData.get("publicSlug"));
  const publicBookingEnabled = formData.get("publicBookingEnabled") === "on";

  if (!publicSlug) {
    return {
      success: false,
      message: "Informe um identificador publico valido para a empresa.",
    };
  }

  if (publicSlug.length < 3 || publicSlug.length > 50) {
    return {
      success: false,
      message: "O identificador publico deve ter entre 3 e 50 caracteres.",
    };
  }

  const { error } = await supabase
    .from("companies")
    .update({
      public_slug: publicSlug,
      public_booking_enabled: publicBookingEnabled,
    })
    .eq("id", companyId);

  if (error) {
    if (error.message.includes("companies_public_slug_unique")) {
      return {
        success: false,
        message: "Esse identificador publico ja esta em uso por outra empresa.",
      };
    }

    if (error.message.includes("public_slug")) {
      return {
        success: false,
        message:
          "Seu banco ainda nao possui as colunas publicas. Execute o script docs/database/008_etapa15_agendamento_publico.sql e tente novamente.",
      };
    }

    return {
      success: false,
      message: `Nao foi possivel salvar as configuracoes publicas: ${error.message}`,
    };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/publico");

  return {
    success: true,
    message: "Configuracoes publicas atualizadas com sucesso.",
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
