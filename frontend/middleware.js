import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define the routes that do NOT require login
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/community',
  '/explore(.*)',
  '/workspace(.*)', // Kept public because we handle Sandbox limits internally
  '/api/webhook(.*)', // CRITICAL: Keep webhooks public so Lemon Squeezy can reach them
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};