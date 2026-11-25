// Student-friendly compiler-error explainer. Pure functions: raw clang/JSCPP/runtime text -> plain-language help in
// English, Roman Urdu or Urdu script. Code and technical terms always stay in English.
export type Lang = "en" | "roman" | "ur";
export type Explained = { line: number | null; col: number | null; severity: "error" | "warning"; raw: string; title: string; help: string; fix?: string };

type Rule = {
  test: RegExp;
  en: (m: RegExpExecArray) => { title: string; help: string; fix?: string };
  roman: (m: RegExpExecArray) => { title: string; help: string };
  ur: (m: RegExpExecArray) => { title: string; help: string };
};

const STD_NAMES = new Set(["cout", "cin", "endl", "string", "vector", "getline", "setw", "setprecision", "ifstream", "ofstream", "fstream", "sqrt", "pow", "abs"]);

const RULES: Rule[] = [
  {
    test: /expected ';'/,
    en: () => ({ title: "A semicolon (;) is missing", help: "Every statement must end with a semicolon. Look at the end of the line shown (or the line just before it) and add ;", fix: "Add ; at the end of the statement." }),
    roman: () => ({ title: "Semicolon (;) missing hai", help: "Har statement ke end par semicolon lagana zaroori hai. Dikhayi gayi line (ya us se pehli line) ke end par ; laga dein." }),
    ur: () => ({ title: "سیمی کولن (;) غائب ہے", help: "ہر statement کے آخر میں سیمی کولن ضروری ہے۔ دکھائی گئی لائن (یا اس سے پہلی لائن) کے آخر میں ; لگائیں۔" }),
  },
  {
    test: /use of undeclared identifier '(\w+)'/,
    en: (m) =>
      STD_NAMES.has(m[1])
        ? { title: `'${m[1]}' is not known here`, help: `Add #include for its library at the top (for cout/cin use #include <iostream>, for string use #include <string>) and write using namespace std; after the includes.`, fix: "#include <iostream>\nusing namespace std;" }
        : { title: `The name '${m[1]}' is not declared`, help: `C++ does not know '${m[1]}'. Either you forgot to declare it (for example int ${m[1]};), you declared it later or inside another block { }, or it is a spelling/capital-letter mistake (C++ is case-sensitive).` },
    roman: (m) =>
      STD_NAMES.has(m[1])
        ? { title: `'${m[1]}' yahan samajh nahi aaya`, help: "Upar #include <iostream> (string ke liye #include <string>) aur using namespace std; likhna bhool gaye hain." }
        : { title: `'${m[1]}' declare nahi kiya gaya`, help: `Aap ne '${m[1]}' ko declare nahi kiya (jaise int ${m[1]};), ya spelling / capital letter ghalat hai. C++ case-sensitive hai.` },
    ur: (m) => ({ title: `'${m[1]}' declare نہیں ہوا`, help: `C++ کو '${m[1]}' کا پتا نہیں۔ اسے declare کریں (مثلاً int ${m[1]};) یا spelling اور capital/small حروف چیک کریں۔ cout/cin کے لیے #include <iostream> اور using namespace std; لکھیں۔` }),
  },
  {
    test: /no member named '(\w+)' in namespace 'std'/,
    en: (m) => ({ title: `'std::${m[1]}' needs its library`, help: `Add the right #include at the top (iostream for cout/cin, string for string, cmath for sqrt/pow, fstream for files).` }),
    roman: (m) => ({ title: `'${m[1]}' ke liye library include karein`, help: "Upar sahi #include likhein (iostream, string, cmath, fstream)." }),
    ur: (m) => ({ title: `'${m[1]}' کے لیے library include کریں`, help: "اوپر درست #include لکھیں (iostream, string, cmath, fstream)۔" }),
  },
  {
    test: /expected '\}'|expected '\)'|expected '\]'|expected '\{'|expected '\('/,
    en: (m) => ({ title: "A bracket is missing or does not match", help: `The compiler expected ${/expected '(.)'/.exec(m[0])?.[1] ?? "a bracket"} here. Count your ( ) and { } and make every opening bracket have a closing one.` }),
    roman: () => ({ title: "Bracket missing ya match nahi kar raha", help: "( ) aur { } ginein: har opening bracket ka closing bracket hona chahiye." }),
    ur: () => ({ title: "بریکٹ غائب ہے یا میل نہیں کھاتا", help: "( ) اور { } گنیں: ہر کھلے بریکٹ کا بند بریکٹ ہونا چاہیے۔" }),
  },
  {
    test: /'([\w.<>]+)' file not found/,
    en: (m) => ({ title: `The library '${m[1]}' was not found`, help: "Check the spelling after #include. Common ones: <iostream>, <string>, <cmath>, <fstream>, <iomanip>.", fix: "#include <iostream>" }),
    roman: (m) => ({ title: `Library '${m[1]}' nahi mili`, help: "#include ke baad spelling check karein: <iostream>, <string>, <cmath>, <fstream>, <iomanip>." }),
    ur: (m) => ({ title: `Library '${m[1]}' نہیں ملی`, help: "#include کے بعد spelling چیک کریں: <iostream>, <string>, <cmath>, <fstream>۔" }),
  },
  {
    test: /cannot initialize a variable of type '([^']+)' with an? (?:lvalue|rvalue) of type '([^']+)'/,
    en: (m) => ({ title: "Wrong kind of value for this variable", help: `The variable is of type ${m[1]} but you gave it a value of type ${m[2]}. For example, text in quotes cannot be stored in an int; use string for text, int for whole numbers, double for decimals.` }),
    roman: (m) => ({ title: "Variable mein ghalat qisam ki value", help: `Variable ${m[1]} type ka hai lekin aap ne ${m[2]} type ki value di. Text ke liye string, poore number ke liye int, decimal ke liye double use karein.` }),
    ur: (m) => ({ title: "variable میں غلط قسم کی value", help: `variable کی type ${m[1]} ہے لیکن آپ نے ${m[2]} type کی value دی۔ text کے لیے string، پورے نمبر کے لیے int، اعشاریہ کے لیے double استعمال کریں۔` }),
  },
  {
    test: /cannot assign to variable '(\w+)' with const-qualified type/,
    en: (m) => ({ title: `'${m[1]}' is a constant and cannot change`, help: `You declared ${m[1]} with const, so its value is fixed. Remove const if the value must change.` }),
    roman: (m) => ({ title: `'${m[1]}' constant hai, badal nahi sakta`, help: `${m[1]} const ke saath declare hua hai. Value badalni hai to const hata dein.` }),
    ur: (m) => ({ title: `'${m[1]}' const ہے، بدل نہیں سکتا`, help: `${m[1]} کو const کے ساتھ declare کیا گیا ہے۔ value بدلنی ہو تو const ہٹا دیں۔` }),
  },
  {
    test: /no matching function for call to '(\w+)'/,
    en: (m) => ({ title: `The call to ${m[1]}() does not match its definition`, help: `Check how many arguments you pass and their types. The function ${m[1]} expects different arguments than you gave.` }),
    roman: (m) => ({ title: `${m[1]}() ka call definition se match nahi karta`, help: "Arguments ki tadaad aur type check karein." }),
    ur: (m) => ({ title: `${m[1]}() کی call اس کی definition سے میل نہیں کھاتی`, help: "arguments کی تعداد اور type چیک کریں۔" }),
  },
  {
    test: /too (few|many) arguments to function call/,
    en: (m) => ({ title: `Too ${m[1]} arguments`, help: "The function needs a different number of arguments. Compare your call with the function's parameter list." }),
    roman: () => ({ title: "Arguments kam ya zyada hain", help: "Function ki parameter list se apna call mila kar dekhein." }),
    ur: () => ({ title: "arguments کم یا زیادہ ہیں", help: "function کی parameter list سے اپنی call ملائیں۔" }),
  },
  {
    test: /redefinition of '(\w+)'/,
    en: (m) => ({ title: `'${m[1]}' is declared twice`, help: `You already declared ${m[1]} in this block. Use the existing variable (write ${m[1]} = value;) instead of declaring it again.` }),
    roman: (m) => ({ title: `'${m[1]}' do baar declare hua`, help: `${m[1]} pehle hi declare ho chuka hai. Dobara type likhe baghair sirf ${m[1]} = value; likhein.` }),
    ur: (m) => ({ title: `'${m[1]}' دو بار declare ہوا`, help: `${m[1]} پہلے ہی declare ہو چکا ہے۔ دوبارہ type لکھے بغیر صرف ${m[1]} = value; لکھیں۔` }),
  },
  {
    test: /unknown type name '(\w+)'/,
    en: (m) => ({ title: `'${m[1]}' is not a type`, help: "Use C++ types: int, double, float, char, bool, string (with #include <string>). Check spelling and capital letters." }),
    roman: (m) => ({ title: `'${m[1]}' koi type nahi`, help: "int, double, char, bool, string use karein; spelling check karein." }),
    ur: (m) => ({ title: `'${m[1]}' کوئی type نہیں`, help: "int, double, char, bool, string استعمال کریں اور spelling چیک کریں۔" }),
  },
  {
    test: /invalid operands to binary expression \('(\w+)' and '(\w+)'\)/,
    en: (m) => ({ title: "This operator cannot be used with these types", help: `You used an operator on ${m[1]} and ${m[2]} that is not allowed. Example: % works only on whole numbers (int), not on double.` }),
    roman: (m) => ({ title: "Is operator ke saath ye types nahi chalte", help: `${m[1]} aur ${m[2]} par ye operator allowed nahi. Misal: % sirf int par chalta hai, double par nahi.` }),
    ur: (m) => ({ title: "اس operator کے ساتھ یہ types نہیں چلتیں", help: `${m[1]} اور ${m[2]} پر یہ operator جائز نہیں۔ مثال: % صرف int پر چلتا ہے، double پر نہیں۔` }),
  },
  {
    test: /expected expression/,
    en: () => ({ title: "The compiler expected a value or expression here", help: "Often caused by a stray ; or , or a missing value, for example a semicolon before else, or an operator with nothing after it." }),
    roman: () => ({ title: "Yahan value ya expression chahiye thi", help: "Faltu ; ya , ho sakta hai, ya else se pehle semicolon laga hai, ya operator ke baad value nahi." }),
    ur: () => ({ title: "یہاں value یا expression چاہیے تھی", help: "فالتو ; یا , ہو سکتا ہے، یا else سے پہلے سیمی کولن لگا ہے۔" }),
  },
  {
    test: /declared as an array with a negative size/,
    en: () => ({ title: "Array size cannot be negative", help: "The size inside [ ] must be a positive whole number." }),
    roman: () => ({ title: "Array ka size negative nahi ho sakta", help: "[ ] ke andar positive poora number likhein." }),
    ur: () => ({ title: "array کا سائز منفی نہیں ہو سکتا", help: "[ ] کے اندر مثبت پورا عدد لکھیں۔" }),
  },
  {
    test: /cannot use '(throw|try|catch)' with exceptions disabled/,
    en: () => ({ title: "try/catch/throw does not work in browser mode", help: "Exceptions are not part of CC111 and are switched off in this browser compiler. Use if statements to check for problems instead." }),
    roman: () => ({ title: "Browser mode mein try/catch/throw nahi chalta", help: "Exceptions CC111 ka hissa nahi; unki jagah if statements se check karein." }),
    ur: () => ({ title: "browser mode میں try/catch/throw نہیں چلتا", help: "exceptions CC111 کا حصہ نہیں؛ ان کی جگہ if سے چیک کریں۔" }),
  },
  {
    test: /undefined reference to 'main'/,
    en: () => ({ title: "Your program has no main()", help: "Every C++ program must have int main() { ... }. Check that it is spelled exactly main (small letters) and is not inside another function.", fix: "int main() {\n    return 0;\n}" }),
    roman: () => ({ title: "Program mein main() nahi hai", help: "Har C++ program mein int main() { ... } zaroori hai; spelling chhote harf mein main honi chahiye." }),
    ur: () => ({ title: "پروگرام میں main() نہیں ہے", help: "ہر C++ پروگرام میں int main() { ... } لازمی ہے؛ spelling چھوٹے حروف میں main ہو۔" }),
  },
  {
    test: /undefined reference to '(\w+)'/,
    en: (m) => ({ title: `Function '${m[1]}' is used but never written`, help: `You call or declare ${m[1]}() but its body (definition) is missing, or its name/parameters differ between the declaration and the definition.` }),
    roman: (m) => ({ title: `Function '${m[1]}' use hua lekin likha nahi gaya`, help: `${m[1]}() ka body (definition) missing hai ya naam/parameters declaration se alag hain.` }),
    ur: (m) => ({ title: `function '${m[1]}' استعمال ہوا مگر لکھا نہیں گیا`, help: `${m[1]}() کی definition غائب ہے یا نام/parameters مختلف ہیں۔` }),
  },
  {
    test: /variable '(\w+)' is uninitialized/,
    en: (m) => ({ title: `'${m[1]}' is used before it has a value`, help: `Give ${m[1]} a starting value (int ${m[1]} = 0;) or read it with cin before using it. Otherwise it holds a random leftover number.` }),
    roman: (m) => ({ title: `'${m[1]}' ko value dene se pehle use kiya`, help: `${m[1]} ko shuru mein value dein (int ${m[1]} = 0;) ya cin se parhein.` }),
    ur: (m) => ({ title: `'${m[1]}' کو value دینے سے پہلے استعمال کیا`, help: `${m[1]} کو ابتدائی value دیں (int ${m[1]} = 0;) یا cin سے پڑھیں۔` }),
  },
  {
    test: /using the result of an assignment as a condition|equality comparison with extraneous parentheses/,
    en: () => ({ title: "= (assign) used where == (compare) was probably meant", help: "Inside if (...) use == to compare. A single = stores a value and is almost always true.", fix: "if (x == 5)" }),
    roman: () => ({ title: "= ki jagah == likhna tha", help: "if (...) ke andar compare karne ke liye == use karein; single = value store karta hai." }),
    ur: () => ({ title: "= کی جگہ == لکھنا تھا", help: "if (...) کے اندر مقابلے کے لیے == استعمال کریں۔" }),
  },
  {
    test: /non-void function does not return a value/,
    en: () => ({ title: "This function should return a value", help: "The function has a return type like int but no return statement. Add return value; at the end." }),
    roman: () => ({ title: "Function ko value return karni chahiye", help: "Function ka return type (jaise int) hai lekin return statement nahi. End par return value; likhein." }),
    ur: () => ({ title: "function کو value return کرنی چاہیے", help: "return type (مثلاً int) ہے مگر return نہیں۔ آخر میں return value; لکھیں۔" }),
  },
  {
    test: /if statement has empty body|for loop has empty body|while loop has empty body/,
    en: () => ({ title: "A semicolon right after ) makes the body empty", help: "Remove the ; directly after if (...), for (...) or while (...). It ends the statement before the body starts." }),
    roman: () => ({ title: ") ke foran baad semicolon se body khali ho gayi", help: "if/for/while (...) ke foran baad wala ; hata dein." }),
    ur: () => ({ title: ") کے فوراً بعد سیمی کولن سے body خالی ہو گئی", help: "if/for/while (...) کے فوراً بعد والا ; ہٹا دیں۔" }),
  },
  {
    test: /pointer|rvalue of type 'int'/,
    en: () => ({ title: "A pointer and a plain number were mixed", help: "A pointer stores an address, not a number. Use &variable to get an address, or new to allocate memory." }),
    roman: () => ({ title: "Pointer aur number mix ho gaye", help: "Pointer address rakhta hai; address ke liye &variable ya memory ke liye new use karein." }),
    ur: () => ({ title: "pointer اور عدد خلط ملط ہو گئے", help: "pointer address رکھتا ہے؛ address کے لیے &variable یا new استعمال کریں۔" }),
  },
];

const LINE = /^(?:main\.cpp|<stdin>|[\w./-]+\.cpp):(\d+):(\d+):\s*(fatal error|error|warning):\s*(.*)$/;

export function explainCompilerOutput(raw: string, lang: Lang = "en"): Explained[] {
  const out: Explained[] = [];
  const seen = new Set<string>();
  for (const l of raw.split(/\r?\n/)) {
    const m = LINE.exec(l);
    const plain = !m && /^error: /.test(l) ? /^error: (.*)$/.exec(l) : null; // linker-style lines from the runner
    if (!m && !plain) continue;
    const text = m ? m[4] : plain![1];
    const sev: "error" | "warning" = m && m[3] === "warning" ? "warning" : "error";
    if (seen.has(`${m?.[1]}:${text}`)) continue;
    seen.add(`${m?.[1]}:${text}`);
    let title = sev === "error" ? "The compiler found a problem" : "The compiler has a warning";
    let help = text;
    let fix: string | undefined;
    for (const r of RULES) {
      const rm = r.test.exec(text);
      if (!rm) continue;
      const en = r.en(rm);
      const t = lang === "roman" ? r.roman(rm) : lang === "ur" ? r.ur(rm) : en;
      title = t.title; help = t.help; fix = en.fix;
      break;
    }
    out.push({ line: m ? Number(m[1]) : null, col: m ? Number(m[2]) : null, severity: sev, raw: text, title, help, fix });
  }
  return out;
}

/** Runtime failures (WebAssembly traps and runner limits) in plain words. */
export function explainRuntime(kind: "trap" | "timeout" | "output" | "unsupported", detail: string | undefined, lang: Lang = "en"): { title: string; help: string } {
  const d = (detail ?? "").toLowerCase();
  const pick = (en: [string, string], roman: [string, string], ur: [string, string]) => {
    const x = lang === "roman" ? roman : lang === "ur" ? ur : en;
    return { title: x[0], help: x[1] };
  };
  if (kind === "timeout") return pick(
    ["The program ran too long and was stopped", "It is probably stuck in an endless loop. Check that your loop condition can become false and that the counter changes inside the loop."],
    ["Program bohat der chala aur rok diya gaya", "Shayad endless loop hai. Loop ki condition false honay ka rasta aur counter ka badalna check karein."],
    ["پروگرام بہت دیر چلا اور روک دیا گیا", "شاید endless loop ہے۔ loop کی condition کے false ہونے کا راستہ اور counter کا بدلنا چیک کریں۔"]);
  if (kind === "output") return pick(
    ["Too much output, the program was stopped", "It printed more than the allowed amount, usually an endless loop containing cout."],
    ["Bohat zyada output, program rok diya gaya", "Aksar cout wali endless loop hoti hai."],
    ["بہت زیادہ output، پروگرام روک دیا گیا", "عموماً cout والا endless loop ہوتا ہے۔"]);
  if (kind === "unsupported") return pick(
    ["This feature is not available in browser mode", detail ?? ""],
    ["Ye feature browser mode mein available nahi", detail ?? ""],
    ["یہ feature browser mode میں دستیاب نہیں", detail ?? ""]);
  if (/divide by zero|division by zero/.test(d)) return pick(
    ["Division by zero", "You divided a whole number by 0. Check the divisor before dividing, for example if (b != 0)."],
    ["Zero se taqseem", "Int ko 0 se divide kiya. Divide karne se pehle check karein: if (b != 0)."],
    ["صفر سے تقسیم", "int کو 0 سے تقسیم کیا۔ پہلے چیک کریں: if (b != 0)۔"]);
  if (/out of bounds|memory access/.test(d)) return pick(
    ["Memory access outside the allowed area", "Usually an array index that is too big or negative (valid indexes are 0 to size-1), or a pointer that does not point to real memory."],
    ["Memory ki ghalat jagah access hui", "Aksar array index bara ya negative hota hai (sahi index 0 se size-1 tak), ya pointer ghalat hai."],
    ["میموری کی غلط جگہ تک رسائی", "عموماً array index بڑا یا منفی ہوتا ہے (درست index 0 سے size-1)، یا pointer غلط ہے۔"]);
  if (/call stack|stack/.test(d)) return pick(
    ["Too many nested function calls", "A recursive function probably has no base case, or never reaches it, so it keeps calling itself."],
    ["Function calls bohat zyada gehri ho gayi", "Recursive function mein base case nahi ya kabhi pura nahi hota."],
    ["function calls بہت گہری ہو گئیں", "recursive function میں base case نہیں یا کبھی پورا نہیں ہوتا۔"]);
  return pick(
    ["The program stopped because of an error", "The program crashed while running. Check array indexes, pointers and divisions."],
    ["Program error ki wajah se ruk gaya", "Array index, pointer aur division check karein."],
    ["پروگرام error کی وجہ سے رک گیا", "array index، pointer اور division چیک کریں۔"]);
}
