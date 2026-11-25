import { shortTitle } from "./short-titles";
import { SITE_NAME } from "./site";

/** Search-result title (60 characters or fewer with the site name) and description (120 to 155 characters) for a lesson. */
export function lessonSeo(week: number, slug: string, fullTitle: string): { title: string; description: string; short: string } {
  const short = shortTitle(`w${week}/${slug}`, fullTitle);
  let title = `${short} in C++ for Beginners`;
  if (`${title} | ${SITE_NAME}`.length > 60) title = `${short} in C++`;
  let description = `Learn ${short} in C++ with an animation, worked examples, common mistakes and a quiz. Week ${week} of CC111 Programming Fundamentals.`;
  if (description.length > 155) description = `Learn ${short} in C++ with an animation, worked examples and a quiz. Week ${week} of CC111 Programming Fundamentals.`;
  return { title, description, short };
}
