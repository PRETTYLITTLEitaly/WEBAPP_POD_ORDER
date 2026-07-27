export interface User {
  id: string;
  email: string;
  password?: string;
  role: "admin" | "operatore";
  createdAt: string;
}

const USERS_KEY = "app_users_database";
const CURRENT_USER_KEY = "app_current_user";

export const DEFAULT_ADMIN: User = {
  id: "admin-default",
  email: "admin@prettylittleitaly.it",
  password: "admin",
  role: "admin",
  createdAt: new Date().toISOString()
};

export function getUsers(): User[] {
  if (typeof window === "undefined") return [DEFAULT_ADMIN];
  const saved = localStorage.getItem(USERS_KEY);
  if (!saved) {
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_ADMIN]));
    return [DEFAULT_ADMIN];
  }
  try {
    const users: User[] = JSON.parse(saved);
    if (!users.some(u => u.role === "admin")) {
      users.unshift(DEFAULT_ADMIN);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    return users;
  } catch (e) {
    console.error(e);
    return [DEFAULT_ADMIN];
  }
}

export function saveUsers(users: User[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(CURRENT_USER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }
  return null;
}

export function setCurrentUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) {
    // Hide password from stored session
    const { password, ...safeUser } = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}
