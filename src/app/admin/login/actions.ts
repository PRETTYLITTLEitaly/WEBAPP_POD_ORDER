"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const password = formData.get("password") as string;
  const adminPassword = process.env.ADMIN_TOOL_PASSWORD;

  if (!adminPassword) {
    return { error: "Errore di configurazione: ADMIN_TOOL_PASSWORD non impostata nel server." };
  }

  if (password === adminPassword) {
    const cookieStore = await cookies();
    cookieStore.set("admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 giorno
      path: "/",
    });
    
    redirect("/admin/shopify-connect");
  } else {
    return { error: "Password errata" };
  }
}
