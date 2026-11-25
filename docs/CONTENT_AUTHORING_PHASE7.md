# Authoring addendum for Weeks 3-8 (read AFTER docs/CONTENT_AUTHORING.md)

The base guide still applies in full (3 worked examples, traces, practice, quiz, verification workflow). Weeks 3-8 add richer visuals.

## New `visuals` kinds (see `lib/content-schema.ts` for the exact schema, and the matching components in `components/visuals/`)
Use 1-3 visuals per lesson, chosen to teach the concept. Parameters are validated by the schema; the generators (`lib/visuals/*.ts`) are already unit-tested against real g++ runs, so just supply good parameters.

| kind | use for | parameters |
|---|---|---|
| `array` | arrays lessons | `mode`: `access` (index slider + out-of-bounds warning + write a value), `search` (linear search sweep; set `target`), `minmax`, `sum`, `reverse`; `values`: 2-12 integers |
| `sort` | bubble / selection sort | `algo`: `bubble` or `selection`; `values`: 3-12 integers 1-99; `compare: true` shows both algorithms side by side (use it in the lesson that compares them) |
| `pattern` | nested loops / patterns | `shape`: `right-triangle`, `inverted-triangle`, `pyramid`, `diamond`, `square`, `hollow-square`, `number-triangle`, `multiplication-table`; `n`: 2-8 |
| `matrix` | 2-D array lessons | `op`: `add`, `transpose`, `multiply`, `search` (largest element), `count-even`, `diagonal`; `a` (and `b` for add/multiply), up to 4x4, integers -9..99; multiplication needs columns(a) = rows(b) |
| `resolver` | function overloading | `overloads`: list of `{sig, params}` (params from int/double/char/string/bool); `argTypes`: initial call |
| `pipeline`, `match`, `decision`, `truth`, `switch` | as before | loop anatomy (`pipeline`: initialise -> check condition -> run body -> update -> repeat) and `match` work well for loops/functions |

Loops, searching and functions are taught mainly with **traces** (they show a variable table, output and the highlighted line). Make the trace follow the loop iterations: one step per interesting event (condition check, body, update), 8-16 steps. For function lessons add **call-stack** information to trace steps:
`"stack": [{ "fn": "main()", "vars": { "x": "5" } }, { "fn": "square(n)", "vars": { "n": "5" } }]` (outermost first). Use it for pass-by-value vs pass-by-reference (show that the callee's `a` is a copy or the same box), scope, static variables and recursion-free call/return. Keep `vars` (the variable boxes) consistent with the stack.

## Week order and exact slugs (files go in `content/week-0N/<slug>.json`, `week` = N)
- Week 3: `for-loop`(1) `while-loop`(2) `do-while-loop`(3) `goto-statement`(4) `break-continue`(5)
- Week 4: `arrays-intro`(1) `array-input-output`(2) `linear-search`(3) `min-max`(4) `array-operations`(5) `character-arrays`(6)
- Week 5: `nested-loops`(1) `series-and-sequences`(2) `pattern-generation`(3) `bubble-sort`(4) `selection-sort`(5)
- Week 6: `two-d-arrays`(1) `matrix-addition-transpose`(2) `matrix-multiplication`(3) `matrix-search-count-type`(4) `three-d-arrays`(5)
- Week 7: `functions-intro`(1) `function-types`(2) `parameters-arguments`(3) `pass-by-value-reference`(4) `static-and-scope`(5)
- Week 8: `function-prototype`(1) `default-arguments`(2) `function-overloading`(3)
Source notes: sections 3.x-8.x of `content-extracted/CC111_Programming_Fundamentals_Complete_Notes_docx.txt`; slides: `PF_Looping_Structures_Lecture_pptx.txt` (loops), `Arrays_I_pptx.txt` (arrays), `Nested_Loops_Programming_Fundamentals_pptx.txt` (nested loops), `Bubble_Sort_Selection_Sort_pptx.txt` (sorting). Weeks 6-8 have no slides: use the notes and Gaddis (grep only).

## Extra rules
- Only use features students have met by that week (no vectors, no `string` before Week 11 except in obvious input/output of a name, no references before Week 7, no pointers before Week 9). Arrays use fixed sizes; `const int N = 5;` for sizes is fine from Week 4.
- Sorting lessons: bubble sort and selection sort must each have their own distinct explanation, code, trace and visual (the instructor stressed this).
- Exam-level samples should look like university exam questions (trace the output, find the error, complete the code, write the program).
- Run the verifier with `--only <slug> ...` for your files; it also checks trace outputs against the real program output.
