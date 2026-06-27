import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rotas públicas — não exigem autenticação
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding",          // ← acessível sem redirect extra (usuário já autenticado)
  "/portal/:slug",        // Página de login do portal (pública)
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};