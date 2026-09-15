import { auth } from "@/lib/auth";

const PUBLIC_ROUTES = ["/login", "/register"];

// Metadata routes must answer without a session — the crawlers that render link
// previews are never signed in. They can sit at any depth (/post/<id>/
// opengraph-image), so matching the segment beats listing prefixes in the
// matcher below.
const METADATA_ROUTE = /\/(opengraph-image|twitter-image|icon|apple-icon)(-\w+)?(\/\d+)?$/;

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  if (METADATA_ROUTE.test(pathname)) return;

  const isAuthed = Boolean(req.auth);
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!isAuthed && !isPublic) {
    const target = new URL("/login", req.nextUrl);
    target.searchParams.set("callbackUrl", pathname);
    return Response.redirect(target);
  }

  if (isAuthed && isPublic) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
