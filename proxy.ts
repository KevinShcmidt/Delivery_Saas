/**
 * proxy.ts
 * ─────────────────────────────────────────────
 * Middleware d'authentification et protection des routes par rôle
 *
 * Flux : Lire cookie session → Décider redirect → Retour réponse
 *
 * ⚠️  ÉCART VOLONTAIRE aux best practices :
 *     On utilise getSession() au lieu de getUser() dans ce middleware.
 *     Raison : getUser() fait une requête réseau à chaque navigation,
 *     ce qui est inacceptable pour un middleware qui s'exécute sur
 *     TOUTES les routes. getSession() lit uniquement le cookie JWT
 *     en mémoire (pas de réseau). La validation serveur stricte
 *     est faite dans chaque Server Component sensible via getUser().
 *     Ref: https://supabase.com/docs/guides/auth/server-side/nextjs
 * ─────────────────────────────────────────────
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { UserRole } from "@/core/types";

/* ─────────────────────────────────────────────
   Configuration des routes
   
   PUBLIC_ONLY_ROUTES   → accessibles UNIQUEMENT si non connecté
                          (redirect vers home si déjà connecté)
   FULLY_PUBLIC_ROUTES  → accessibles par tout le monde
   ROLE_PROTECTED_ROUTES→ nécessitent un rôle spécifique
───────────────────────────────────────────── */

const PUBLIC_ONLY_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
] as const;

const FULLY_PUBLIC_ROUTES = ["/", "/auth/confirm"] as const;

const ROLE_PROTECTED_ROUTES: {
  pattern: RegExp;
  allowedRoles: UserRole[];
}[] = [
  { pattern: /^\/couriers(\/.*)?$/, allowedRoles: ["admin"] },
  { pattern: /^\/admin(\/.*)?$/, allowedRoles: ["admin"] },
  {
    pattern: /^\/dashboard(\/.*)?$/,
    allowedRoles: ["admin", "courier"],
  },
  {
    pattern: /^\/orders(\/.*)?$/,
    allowedRoles: ["admin", "courier", "client"],
  },
  {
    pattern: /^\/profile(\/.*)?$/,
    allowedRoles: ["admin", "courier", "client"],
  },
];

/* ─────────────────────────────────────────────
   Helpers de routing
───────────────────────────────────────────── */

/** Route accessible à tous (connecté ou non) */
const isFullyPublicRoute = (pathname: string): boolean =>
  FULLY_PUBLIC_ROUTES.some((route) => pathname === route);

/** Route réservée aux utilisateurs NON connectés */
const isPublicOnlyRoute = (pathname: string): boolean =>
  PUBLIC_ONLY_ROUTES.some((route) => pathname.startsWith(route));

/** Trouve la config de protection par rôle pour ce pathname */
const findProtectedRoute = (pathname: string) =>
  ROLE_PROTECTED_ROUTES.find(({ pattern }) => pattern.test(pathname));

/** Redirige vers la bonne page d'accueil selon le rôle */
const getHomeByRole = (role: UserRole): string => {
  if (role === "admin" || role === "courier") return "/dashboard";
  return "/orders";
};

/* ─────────────────────────────────────────────
   Lecture du cookie de session
   
   Supabase SSR nécessite un client pour décoder
   le cookie JWT stocké dans le navigateur.
   Aucune requête réseau n'est effectuée ici.
───────────────────────────────────────────── */

async function readSessionFromCookie(request: NextRequest): Promise<{
  response: NextResponse;
  userId: string | null;
  userRole: UserRole;
}> {
  // On crée la réponse en avance pour pouvoir y attacher les cookies rafraîchis
  const response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      // Lecture des cookies depuis la requête entrante
      getAll() {
        return request.cookies.getAll();
      },
      // Écriture des cookies rafraîchis dans la requête ET la réponse
      // (nécessaire pour que le token ne soit pas perdu entre les navigations)
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // ⚠️ getSession() = lecture locale du JWT (pas de réseau)
  // La vérification cryptographique se fait dans les Server Components via getUser()
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  // Le rôle est stocké dans app_metadata (défini par un trigger Supabase)
  // Fallback sur user_metadata puis "client" par défaut
  const userRole = (user?.app_metadata?.role ??
    user?.user_metadata?.role ??
    "client") as UserRole;

  return {
    response,
    userId: user?.id ?? null,
    userRole,
  };
}

/* ─────────────────────────────────────────────
   Proxy principal (middleware Next.js)
───────────────────────────────────────────── */

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  /* ── ÉTAPE 1 : Routes entièrement publiques ──────────────────
     Aucune vérification nécessaire, on laisse passer directement.
     Ex: page d'accueil marketing, callback auth Supabase
  ─────────────────────────────────────────────────────────────── */
  if (isFullyPublicRoute(pathname)) {
    return NextResponse.next({ request });
  }

  /* ── ÉTAPE 2 : Lecture du cookie de session ──────────────────
     On lit le JWT une seule fois pour toutes les décisions suivantes.
  ─────────────────────────────────────────────────────────────── */
  const { response, userId, userRole } = await readSessionFromCookie(request);

  const isAuthenticated = userId !== null;

  /* ── ÉTAPE 3 : Pages réservées aux visiteurs (login, register) ──
     Si l'utilisateur est déjà connecté → redirect vers sa home
  ─────────────────────────────────────────────────────────────── */
  if (isPublicOnlyRoute(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(
        new URL(getHomeByRole(userRole), request.url)
      );
    }
    // Visiteur non connecté → accès autorisé
    return response;
  }

  /* ── ÉTAPE 4 : Routes protégées par rôle ────────────────────── */
  const protectedRoute = findProtectedRoute(pathname);

  if (protectedRoute) {
    // 4a. Non connecté → redirect vers login avec l'URL de retour
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 4b. Connecté mais rôle insuffisant → redirect vers sa propre home
    if (!protectedRoute.allowedRoles.includes(userRole)) {
      return NextResponse.redirect(
        new URL(getHomeByRole(userRole), request.url)
      );
    }

    // 4c. Rôle autorisé → accès accordé
    return response;
  }

  /* ── ÉTAPE 5 : Fallback sécurité ────────────────────────────────
     Toute route non catégorisée atteinte par un visiteur
     non connecté est bloquée (défense en profondeur).
  ─────────────────────────────────────────────────────────────── */
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

/* ─────────────────────────────────────────────
   Matcher — routes où ce middleware s'exécute
   
   On exclut _next/static, _next/image, favicon
   et les assets publics pour ne pas ralentir
   le chargement des ressources statiques.
───────────────────────────────────────────── */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};