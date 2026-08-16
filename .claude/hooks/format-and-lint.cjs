const { execFileSync } = require("child_process");
const path = require("path");

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }

  const file = input.tool_input?.file_path ?? input.tool_response?.filePath;
  if (!file) return;

  const ext = path.extname(file).toLowerCase();
  const prettierExts = [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".json",
    ".css",
    ".md",
    ".mdx",
    ".yml",
    ".yaml",
    ".html",
  ];
  const eslintExts = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];

  const root = path.join(__dirname, "..", "..");
  const prettierBin = path.join(root, "node_modules", "prettier", "bin", "prettier.cjs");
  const eslintBin = path.join(root, "node_modules", "eslint", "bin", "eslint.js");

  if (prettierExts.includes(ext)) {
    try {
      execFileSync(process.execPath, [prettierBin, "--write", file], { stdio: "ignore", cwd: root });
    } catch {}
  }

  if (eslintExts.includes(ext)) {
    try {
      execFileSync(process.execPath, [eslintBin, "--fix", file], { stdio: "ignore", cwd: root });
    } catch {}
  }
});
