import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rotas públicas — não exigem autenticação
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/portal/:slug",        // Página de login do portal (pública)
]);

// Rotas do portal do cliente — exigem auth do Clerk mas são separadas do dashboard
const isPortalRoute = createRouteMatcher(["/portal/(.*)"]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
