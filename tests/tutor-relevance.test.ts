import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Topic } from "@/lib/content-schema";
import { CourseSearch } from "@/lib/tutor/search";

// Free "Tier 0" course search: student-style questions must find the right lesson. Pass bar: >= 90% first result, >= 97% in the top 3.
const topics: Topic[] = readdirSync("content").flatMap((wk) => readdirSync(join("content", wk)).filter((f) => f.endsWith(".json")).map((f) => Topic.parse(JSON.parse(readFileSync(join("content", wk, f), "utf8")))));
const search = new CourseSearch(topics);

const CASES: [string, string][] = [
  ["what does cout do in C++", "input-output"], ["how to take input from the user with cin", "input-output"], ["what is a variable", "variables-data-types"], ["difference between int and double", "variables-data-types"],
  ["what is type casting", "type-casting"], ["explain operator precedence", "assignment-and-precedence"], ["what is a compiler", "translators-and-code"], ["compiler vs interpreter", "translators-and-code"],
  ["stages of program development life cycle", "pdlc"], ["how do single line and multi line comments work", "comments"], ["structure of a C++ program hello world", "hello-world"], ["difference between high level and low level language", "programming-languages"],
  ["modulus operator and division", "arithmetic-operators"], ["what is an if statement", "if-statement"], ["if else statement example", "if-else-statement"], ["else if ladder grade program", "if-else-if-ladder"],
  ["nested if example", "nested-if"], ["how does switch statement work", "switch-statement"], ["what is the ternary operator", "ternary-operator"], ["logical operators and or not", "logical-operators"],
  ["relational operators greater than equal to", "relational-operators"], ["for loop syntax", "for-loop"], ["while loop example", "while-loop"], ["difference between while and do while", "do-while-loop"],
  ["what is goto in C++", "goto-statement"], ["break and continue difference", "break-continue"], ["what is an array", "arrays-intro"], ["how to read values into an array", "array-input-output"],
  ["linear search steps", "linear-search"], ["find the largest and smallest element in an array", "min-max"], ["reverse an array and find sum", "array-operations"], ["what is null terminator in char array", "character-arrays"],
  ["nested loops how many times inner loop runs", "nested-loops"], ["print fibonacci series using loop", "series-and-sequences"], ["print a pyramid pattern", "pattern-generation"], ["how does bubble sort work", "bubble-sort"],
  ["selection sort algorithm", "selection-sort"], ["what is a 2d array", "two-d-arrays"], ["how to add two matrices and transpose", "matrix-addition-transpose"], ["matrix multiplication rule", "matrix-multiplication"],
  ["check if a matrix is symmetric or identity", "matrix-search-count-type"], ["what is a 3d array", "three-d-arrays"], ["what is a function in C++", "functions-intro"], ["void function vs function that returns a value", "function-types"],
  ["difference between parameter and argument", "parameters-arguments"], ["pass by reference vs pass by value swap", "pass-by-value-reference"], ["what is a static variable and scope", "static-and-scope"], ["why do we need a function prototype", "function-prototype"],
  ["default arguments in functions", "default-arguments"], ["what is function overloading", "function-overloading"], ["what is the address of operator", "memory-and-addresses"], ["what is a pointer", "what-is-a-pointer"],
  ["pointer arithmetic p plus 1", "pointer-arithmetic"], ["pass by address using pointers", "pass-by-address"], ["relation between arrays and pointers", "arrays-and-pointers"], ["passing an array to a function", "array-to-function"],
  ["stack vs heap memory", "stack-vs-heap"], ["how to use new and delete", "dynamic-memory-allocation"], ["dynamic array with new", "dynamic-arrays"], ["what is recursion base case", "recursion"],
  ["recursive factorial fibonacci gcd", "recursion-examples"], ["difference between string and char array getline", "strings-in-cpp"], ["string find substr append functions", "string-operations"], ["why use a structure", "purpose-of-structures"],
  ["how to declare a struct", "declaring-structures"], ["array of structures", "array-of-structures"], ["member function inside a struct", "member-functions"], ["return a structure from a function", "returning-structures"],
  ["write data into a file with ofstream", "writing-files"], ["read from a file with ifstream", "reading-files"], ["why do we need files", "why-files"], ["search a record in a file", "searching-in-files"],
  ["screen coordinates in graphics", "screen-coordinates"], ["graphics.h functions circle line rectangle", "graphics-functions"], ["draw a house in graphics", "draw-a-house"], ["animation with delay and cleardevice", "simple-animation"],
  ["how to choose a project idea", "choosing-a-project"], ["project presentation checklist", "presentation-checklist"], ["program structure of a menu driven project", "program-structure"],
  ["for loop kya hai", "for-loop"], ["array kya hai", "arrays-intro"], ["pointer kya hai", "what-is-a-pointer"], ["recursion kya hai", "recursion"],
];

describe("tier-0 course search relevance", () => {
  const rows = CASES.map(([q, want]) => { const hits = search.search(q, 3); return { q, want, got: hits.map((h) => h.topic.slug), first: hits[0]?.topic.slug === want, top3: hits.some((h) => h.topic.slug === want) }; });
  it("has at least 60 test queries and every expected lesson exists", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(60);
    for (const [, want] of CASES) expect(topics.some((t) => t.slug === want), want).toBe(true);
  });
  it("finds the right lesson first (>= 90%) and within the top 3 (>= 97%)", () => {
    const first = rows.filter((r) => r.first).length / rows.length, top3 = rows.filter((r) => r.top3).length / rows.length;
    console.info(`RELEVANCE first=${(first * 100).toFixed(1)}% top3=${(top3 * 100).toFixed(1)}% of ${rows.length}`);
    const misses = rows.filter((r) => !r.first).map((r) => `${r.q} -> wanted ${r.want}, got ${r.got.join(",")}`).join("\n");
    expect(first, `first=${(first * 100).toFixed(0)}% top3=${(top3 * 100).toFixed(0)}%\n${misses}`).toBeGreaterThanOrEqual(0.9);
    expect(top3, `top3=${(top3 * 100).toFixed(0)}%\n${misses}`).toBeGreaterThanOrEqual(0.97);
  });
});
