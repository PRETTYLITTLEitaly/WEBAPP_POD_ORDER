"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string || "").trim().toLowerCase();
  const password = (formData.get("password") as string || "").trim();

  if (!email || !password) {
    return { error: "Compila tutti i campi (Email e Password)." };
  }

  const adminEmail = (process.env.ADMIN_TOOL_EMAIL || "admin@prettylittleitaly.it").trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_TOOL_PASSWORD || "admin").trim();

  let isMatch = false;
  let userRole: "admin" | "operatore" = "operatore";
  let userEmail = email;

  // 1. Controllo se viene utilizzata la Password Master di sistema ("admin")
  if (password === adminPassword) {
    isMatch = true;
    userRole = (email === adminEmail || email === "admin@prettylittleitaly.it" || email.includes("admin")) ? "admin" : "operatore";
  } else {
    // 2. Controllo credenziali specifiche salvate per l'utente
    const customUserJson = formData.get("customUserJson") as string;
    if (customUserJson) {
      try {
        const u = JSON.parse(customUserJson);
        if (u && u.email.toLowerCase() === email && u.password === password) {
          isMatch = true;
          userRole = u.role || "operatore";
        }
      } catch (e) {}
    }
  }

  // SE LA PASSWORD È ERRATA -> BLOCCA L'ACCESSO IMMEDIATAMENTE!
  if (!isMatch) {
    return { error: "Email o password errate." };
  }

  const cookieStore = await cookies();
  const sessionData = JSON.stringify({ email: userEmail, role: userRole });

  cookieStore.set("admin_session", sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 giorni
    path: "/",
  });
  
  return { success: true, role: userRole };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  redirect("/admin/login");
}
