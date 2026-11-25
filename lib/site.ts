export const SITE_NAME = "CC111 PF Hub";
export const SITE_TAGLINE = "Programming Fundamentals (C++) at UMT";
// Obscure admin path (security does not depend on it; it only keeps the link out of sight).
export const ADMIN_PATH = "/admin";

/** Public origin used for canonical links, the sitemap and social cards. Set NEXT_PUBLIC_SITE_URL in Vercel for a custom domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
export const SITE_DESCRIPTION = "Learn C++ Programming Fundamentals in one place: simple explanations, animations, code, practice and quizzes for UMT CC111 students.";
