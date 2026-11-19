import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export interface SourceFile {
  path: string;
  component: string;
  imports: string[];
  abstractExports: number;
  concreteExports: number;
}

export function componentOf(filePath: string): string {
  const parts = filePath.replace(/\.ts$/, "").split("/");
  if (parts[0] === "modules" || parts[0] === "platform") return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

function listTsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const fullPath = path.join(dir, name);
    if (statSync(fullPath).isDirectory()) return listTsFiles(fullPath);
    return name.endsWith(".ts") ? [fullPath] : [];
  });
}

function toRelative(srcDir: string, fullPath: string): string {
  return path.relative(srcDir, fullPath).split(path.sep).join("/");
}

function resolveImport(srcDir: string, fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base, `${base}.ts`, path.join(base, "index.ts")];
  const found = candidates.find((c) => existsSync(c) && statSync(c).isFile());
  return found ? toRelative(srcDir, found) : null;
}

const IMPORT_PATTERN = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/g;
const ABSTRACT_EXPORT = /^export\s+(?:interface|type|abstract\s+class)\s/gm;
const CONCRETE_EXPORT = /^export\s+(?:class|(?:async\s+)?function|const|let)\s/gm;

export function analyzeProject(srcDir: string): SourceFile[] {
  return listTsFiles(srcDir).map((file) => {
    const code = readFileSync(file, "utf8");
    const relativePath = toRelative(srcDir, file);

    const imports = [...code.matchAll(IMPORT_PATTERN)]
      .map((match) => match[1])
      .filter((specifier) => specifier.startsWith("."))
      .map((specifier) => resolveImport(srcDir, file, specifier))
      .filter((resolved): resolved is string => resolved !== null);

    return {
      path: relativePath,
      component: componentOf(relativePath),
      imports,
      abstractExports: code.match(ABSTRACT_EXPORT)?.length ?? 0,
      concreteExports: code.match(CONCRETE_EXPORT)?.length ?? 0,
    };
  });
}

export function componentGraph(files: SourceFile[]): Map<string, Set<string>> {
  const componentByPath = new Map(files.map((f) => [f.path, f.component]));
  const graph = new Map<string, Set<string>>();

  for (const file of files) {
    const dependencies = graph.get(file.component) ?? new Set<string>();
    for (const target of file.imports) {
      const targetComponent = componentByPath.get(target);
      if (targetComponent && targetComponent !== file.component) dependencies.add(targetComponent);
    }
    graph.set(file.component, dependencies);
  }

  return graph;
}
