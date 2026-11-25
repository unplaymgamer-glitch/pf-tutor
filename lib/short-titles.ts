// Short, one-line names for the sub-topic lists (module cards and the chat's Topics tab). The full title stays on the lesson page,
// in tooltips and in the workspace header. Rule: the core technical term only, 2 to 4 words, no explanation after a colon.
const SHORT: Record<string, string> = {
  "w1/pdlc": "Program Life Cycle", "w1/programming-languages": "Programming Languages", "w1/translators-and-code": "Translators & Code",
  "w1/hello-world": "Program Structure", "w1/variables-data-types": "Variables & Data Types", "w1/input-output": "Input & Output",
  "w1/comments": "Comments", "w1/arithmetic-operators": "Arithmetic Operators", "w1/assignment-and-precedence": "Assignment & Precedence", "w1/type-casting": "Type Casting",
  "w2/relational-operators": "Relational Operators", "w2/if-statement": "If Statement", "w2/if-else-statement": "If-Else Statement", "w2/if-else-if-ladder": "Else-If Ladder",
  "w2/nested-if": "Nested If", "w2/switch-statement": "Switch Statement", "w2/logical-operators": "Logical Operators", "w2/ternary-operator": "Ternary Operator",
  "w3/for-loop": "For Loop", "w3/while-loop": "While Loop", "w3/do-while-loop": "Do-While Loop", "w3/goto-statement": "Goto Statement", "w3/break-continue": "Break & Continue",
  "w4/arrays-intro": "Arrays Intro", "w4/array-input-output": "Array Input & Output", "w4/linear-search": "Linear Search", "w4/min-max": "Min & Max",
  "w4/array-operations": "Array Operations", "w4/character-arrays": "Character Arrays",
  "w5/nested-loops": "Nested Loops", "w5/series-and-sequences": "Series & Sequences", "w5/pattern-generation": "Pattern Printing", "w5/bubble-sort": "Bubble Sort", "w5/selection-sort": "Selection Sort",
  "w6/two-d-arrays": "2-D Arrays", "w6/matrix-addition-transpose": "Matrix Add & Transpose", "w6/matrix-multiplication": "Matrix Multiplication",
  "w6/matrix-search-count-type": "Matrix Search & Count", "w6/three-d-arrays": "3-D Arrays",
  "w7/functions-intro": "Functions Intro", "w7/function-types": "Types of Functions", "w7/parameters-arguments": "Parameters & Arguments",
  "w7/pass-by-value-reference": "Pass by Value / Reference", "w7/static-and-scope": "Scope & Static",
  "w8/function-prototype": "Function Prototypes", "w8/default-arguments": "Default Arguments", "w8/function-overloading": "Function Overloading",
  "w9/memory-and-addresses": "Memory & Addresses", "w9/what-is-a-pointer": "What Is a Pointer", "w9/pointer-arithmetic": "Pointer Arithmetic", "w9/pass-by-address": "Pass by Address",
  "w10/arrays-and-pointers": "Arrays & Pointers", "w10/array-to-function": "Arrays to Functions", "w10/stack-vs-heap": "Stack vs Heap",
  "w10/dynamic-memory-allocation": "New & Delete", "w10/dynamic-arrays": "Dynamic Arrays",
  "w11/recursion": "Recursion", "w11/recursion-examples": "Recursion Examples", "w11/strings-in-cpp": "Strings in C++", "w11/string-operations": "String Operations",
  "w12/purpose-of-structures": "Why Structures", "w12/declaring-structures": "Declaring Structures", "w12/operations-on-members": "Member Operations", "w12/array-of-structures": "Array of Structures",
  "w13/member-functions": "Member Functions", "w13/passing-structures": "Passing Structures", "w13/array-of-structures-to-function": "Struct Arrays to Functions", "w13/returning-structures": "Returning Structures",
  "w14/why-files": "Why Files", "w14/writing-files": "Writing Files", "w14/reading-files": "Reading Files", "w14/searching-in-files": "Searching Files",
  "w15/screen-coordinates": "Screen Coordinates", "w15/graphics-functions": "Graphics Functions", "w15/draw-a-house": "Draw a House", "w15/simple-animation": "Simple Animation",
  "w16/choosing-a-project": "Choosing a Project", "w16/program-structure": "Project Structure", "w16/presentation-checklist": "Demo Checklist",
};

/** One-line name for a lesson key like "w3/for-loop". Unknown lessons fall back to the text before the first colon, so new lessons still look tidy. */
export function shortTitle(key: string, full: string): string {
  return SHORT[key] ?? full.split(":")[0].trim();
}
export const SHORT_TITLE_KEYS = Object.keys(SHORT);
