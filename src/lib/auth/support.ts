import { cookies } from "next/headers";

export const SUPPORT_COOKIE = "support_company_id";

const SUPPORT_MAX_AGE_SECONDS = 7200;

export async function setSupportCookie(companyId: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SUPPORT_COOKIE, companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SUPPORT_MAX_AGE_SECONDS,
  });
}

export async function clearSupportCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SUPPORT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
