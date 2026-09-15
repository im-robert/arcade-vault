import { createClient } from "@/lib/supabase/client";

export interface AvUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export type OAuthProvider = "google" | "github";

const DUPLICATE_USERNAME_MESSAGE = "Ese usuario ya existe, elige otro";

function isDuplicateUsernameError(message: string | undefined | null): boolean {
  if (!message) return false;
  return (
    message.includes("23505") ||
    message.toLowerCase().includes("duplicate key") ||
    message.toLowerCase().includes("profiles_username_key")
  );
}

function callbackUrl(next?: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/auth/callback`;
  return next ? `${url}?next=${encodeURIComponent(next)}` : url;
}

export async function getUser(): Promise<AvUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    name: profile?.username ?? user.email ?? "Jugador",
    email: user.email ?? "",
    avatarUrl:
      user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  };
}

export async function signUpWithPassword({
  username,
  email,
  password,
}: {
  username: string;
  email: string;
  password: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: callbackUrl(),
    },
  });

  if (error) {
    if (isDuplicateUsernameError(error.message)) {
      return { error: DUPLICATE_USERNAME_MESSAGE };
    }
    return { error: error.message };
  }

  // Supabase responde 200 sin mandar correo si el email ya tiene cuenta
  // (protección anti-enumeración); lo detectamos por identities: [].
  if (data.user && data.user.identities?.length === 0) {
    return {
      error: "Ese correo ya tiene una cuenta. Inicia sesión o usa otro.",
    };
  }

  return { error: null };
}

export async function signInWithPassword({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Correo o contraseña incorrectos" };
  }

  return { error: null };
}

export async function signInWithOAuth(
  provider: OAuthProvider,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl() },
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function requestPasswordReset(
  email: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl("/auth/nueva-password"),
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function updatePassword(
  password: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function saveScore(entry: {
  game: string;
  score: number;
  name: string;
  userId?: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from("scores").insert({
    game_id: entry.game,
    player_name: entry.name,
    score: entry.score,
    user_id: entry.userId ?? null,
  });
}
