"use server";

import { revalidatePath } from "next/cache";

import { getAccessContext, isAdmin } from "@/lib/auth/access";

type ActionState = {
  success: boolean;
  message: string;
};

const BUCKET = "company-logos";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// O tipo enviado pelo navegador pode ser forjado: confere tambem os primeiros bytes.
function matchesSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47].every((value, index) => bytes[index] === value);
  }

  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));

  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
}

type AdminScope =
  | { error: string }
  | { error?: undefined; supabase: Awaited<ReturnType<typeof getAccessContext>>["supabase"]; companyId: string };

async function getAdminScope(): Promise<AdminScope> {
  const scope = await getAccessContext();

  if (!scope.companyId) {
    return { error: scope.errorMessage ?? "Nao foi possivel identificar sua empresa." };
  }

  if (!isAdmin(scope.role)) {
    return { error: "Apenas administradores podem alterar a logo da empresa." };
  }

  return { supabase: scope.supabase, companyId: scope.companyId };
}

export async function uploadLogoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("logo");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Selecione uma imagem para a logo." };
  }

  const extension = EXTENSION_BY_TYPE[file.type];

  if (!extension) {
    return { success: false, message: "Formato invalido. Envie uma imagem PNG, JPEG ou WEBP." };
  }

  if (file.size > MAX_LOGO_BYTES) {
    return { success: false, message: "A imagem deve ter no maximo 2 MB." };
  }

  const scope = await getAdminScope();

  if (scope.error !== undefined) {
    return { success: false, message: scope.error };
  }

  const { supabase, companyId } = scope;
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!matchesSignature(file.type, bytes)) {
    return { success: false, message: "O arquivo nao parece ser uma imagem valida." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("logo")
    .eq("id", companyId)
    .maybeSingle();

  const previousPath = typeof company?.logo === "string" ? company.logo : null;
  const path = `${companyId}/logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { success: false, message: "Nao foi possivel enviar a logo. Tente novamente." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("companies")
    .update({ logo: path })
    .eq("id", companyId)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { success: false, message: "Nao foi possivel salvar a logo. Tente novamente." };
  }

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  revalidatePath("/painel");
  return { success: true, message: "Logo atualizada com sucesso." };
}

export async function removeLogoAction(): Promise<ActionState> {
  const scope = await getAdminScope();

  if (scope.error !== undefined) {
    return { success: false, message: scope.error };
  }

  const { supabase, companyId } = scope;

  const { data: company } = await supabase
    .from("companies")
    .select("logo")
    .eq("id", companyId)
    .maybeSingle();

  const previousPath = typeof company?.logo === "string" ? company.logo : null;

  if (!previousPath) {
    return { success: false, message: "Sua empresa ainda nao tem logo." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("companies")
    .update({ logo: null })
    .eq("id", companyId)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return { success: false, message: "Nao foi possivel remover a logo. Tente novamente." };
  }

  await supabase.storage.from(BUCKET).remove([previousPath]);

  revalidatePath("/painel");
  return { success: true, message: "Logo removida." };
}
