// Official OBE outline order (wins over any slide/folder numbering). See docs/SOURCE_CONFLICTS.md.
export type Chapter = { week: number; slug: string; title: string; summary: string; assessment?: string };

export const CHAPTERS: Chapter[] = [
  { week: 1, slug: "week-1", title: "Introduction to Programming & C++", summary: "Program life cycle, languages, translators, first C++ program, input/output and operators." },
  { week: 2, slug: "week-2", title: "Conditional Structures", summary: "if, if-else, ladders, nested if, switch, logical operators and the ternary operator." },
  { week: 3, slug: "week-3", title: "Loops I", summary: "for, while, do-while, goto, break and continue." },
  { week: 4, slug: "week-4", title: "Arrays I", summary: "1-D arrays, searching, min/max and character arrays.", assessment: "Assignment 1" },
  { week: 5, slug: "week-5", title: "Loops II + Sorting", summary: "Nested loops, patterns, series, Bubble Sort and Selection Sort.", assessment: "Quiz 1" },
  { week: 6, slug: "week-6", title: "Arrays II", summary: "2-D arrays (matrices) and 3-D arrays.", assessment: "Assignment 2" },
  { week: 7, slug: "week-7", title: "Functions I", summary: "Function parts, parameters, pass-by-value and by-reference, static variables.", assessment: "Quiz 2" },
  { week: 8, slug: "week-8", title: "Functions II + Mid-Term", summary: "Prototypes, default arguments, overloading and the Mid-Term revision hub.", assessment: "Mid-Term Exam" },
  { week: 9, slug: "week-9", title: "Pointers I", summary: "Addresses, pointers, pointer arithmetic and pass-by-address." },
  { week: 10, slug: "week-10", title: "Pointers II", summary: "Arrays and pointers, stack vs heap, new/delete and dynamic arrays.", assessment: "Assignment 3" },
  { week: 11, slug: "week-11", title: "Recursion + Strings", summary: "Recursion and string operations.", assessment: "Quiz 3" },
  { week: 12, slug: "week-12", title: "Structures I", summary: "Declaring structures, members and arrays of structures." },
  { week: 13, slug: "week-13", title: "Structures II", summary: "Member functions, passing and returning structures, project guidance.", assessment: "Assignment 4 + Project" },
  { week: 14, slug: "week-14", title: "File Handling (Text)", summary: "Writing, reading and searching text files.", assessment: "Quiz 4" },
  { week: 15, slug: "week-15", title: "Computer Graphics in C", summary: "Screen coordinates and basic graphics functions (simulation)." },
  { week: 16, slug: "week-16", title: "Project Presentations", summary: "Project ideas, rubric, presentation tips and demo checklist." },
];

export const weekSlug = (w: number) => `week-${w}`;
export const weekFromSlug = (s: string): number | null => {
  const m = /^week-(\d{1,2})$/.exec(s);
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 16 ? n : null;
};
export const chapterByWeek = (w: number) => CHAPTERS.find((c) => c.week === w);

/** The ranges the Mid-term and Final hubs / mock exams claim. Pages, mocks and a test all read these. */
export const MID_LAST_WEEK = 8;
export const FINAL_LAST_WEEK = 16;

/** One accent hue per week (the colourful map). Lightness is set per theme in globals.css so text on it stays AA. Loops orange, arrays teal, functions violet, pointers pink, recursion lime. */
export const WEEK_HUES = [205, 150, 28, 175, 18, 190, 265, 285, 330, 345, 85, 45, 60, 220, 305, 10] as const;
export const WEEK_ICONS = ["🧭", "🔀", "🔁", "📦", "🔂", "🧮", "🧩", "🧬", "📍", "🧱", "♻️", "🗂️", "🛠️", "💾", "🎨", "🚀"] as const;

/** The 16 weeks grouped into 10 modules (6 before the Mid-term, 4 after). Each module is a card on the home page; its lessons are its sub-topics. */
export type CourseModule = { id: number; title: string; blurb: string; weeks: number[]; phase: "pre" | "post"; hue: number; art: "flow" | "branch" | "loop" | "bars" | "grid" | "func" | "pointer" | "stack" | "struct" | "files"; icon: string };
export const MODULES: CourseModule[] = [
  { id: 1, title: "Foundations of Programming", blurb: "What a program is, how C++ becomes a running program, your first code, input and output, and operators.", weeks: [1], phase: "pre", hue: 195, art: "flow", icon: "🧭" },
  { id: 2, title: "Making Decisions", blurb: "if, else, ladders, nested if, switch, logical operators and the ternary operator.", weeks: [2], phase: "pre", hue: 150, art: "branch", icon: "🔀" },
  { id: 3, title: "Loops", blurb: "for, while, do-while, goto, break and continue, with a Loop Lab you can step through.", weeks: [3], phase: "pre", hue: 28, art: "loop", icon: "🔁" },
  { id: 4, title: "Arrays: One Dimension", blurb: "Store many values together, search them, find the minimum and maximum, and work with character arrays.", weeks: [4], phase: "pre", hue: 175, art: "bars", icon: "📦" },
  { id: 5, title: "Patterns, Sorting and Matrices", blurb: "Nested loops, patterns, series, Bubble and Selection Sort, then 2-D and 3-D arrays.", weeks: [5, 6], phase: "pre", hue: 45, art: "grid", icon: "🧮" },
  { id: 6, title: "Functions", blurb: "Function parts, parameters, pass by value and by reference, static variables, prototypes, default arguments and overloading.", weeks: [7, 8], phase: "pre", hue: 265, art: "func", icon: "🧩" },
  { id: 7, title: "Pointers and Dynamic Memory", blurb: "Addresses, pointers, pointer arithmetic, arrays and pointers, stack versus heap, new and delete.", weeks: [9, 10], phase: "post", hue: 330, art: "pointer", icon: "📍" },
  { id: 8, title: "Recursion and Strings", blurb: "Functions that call themselves, the call stack, and string operations.", weeks: [11], phase: "post", hue: 85, art: "stack", icon: "♻️" },
  { id: 9, title: "Structures", blurb: "Group related data: structures, members, arrays of structures, passing and returning them.", weeks: [12, 13], phase: "post", hue: 18, art: "struct", icon: "🗂️" },
  { id: 10, title: "Files, Graphics and Project", blurb: "Read and write text files, draw with simple graphics, and plan your final project.", weeks: [14, 15, 16], phase: "post", hue: 220, art: "files", icon: "💾" },
];
export const moduleOfWeek = (w: number) => MODULES.find((m) => m.weeks.includes(w));
