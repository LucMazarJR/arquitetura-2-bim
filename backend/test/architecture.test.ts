import path from "node:path";
import { analyzeProject, type SourceFile } from "../scripts/dependencies";

const files = analyzeProject(path.resolve(__dirname, "../src"));
const componentByPath = new Map(files.map((f) => [f.path, f.component]));

function forbiddenImports(isSource: (file: SourceFile) => boolean, allowed: string[]): string[] {
  return files.filter(isSource).flatMap((file) =>
    file.imports
      .filter((target) => {
        const targetComponent = componentByPath.get(target)!;
        return targetComponent !== file.component && !allowed.includes(targetComponent);
      })
      .map((target) => `${file.path} -> ${target}`),
  );
}

describe("architecture rules", () => {
  it("has the five feature modules", () => {
    const modules = new Set(files.map((f) => f.component).filter((c) => c.startsWith("modules/")));
    expect([...modules].sort()).toEqual([
      "modules/analysis",
      "modules/forecast",
      "modules/ingestion",
      "modules/monitoring",
      "modules/notification",
    ]);
  });

  it("feature modules only depend on contracts and ports, never on another module", () => {
    const isFeatureModule = (f: SourceFile) => f.component.startsWith("modules/");
    expect(forbiddenImports(isFeatureModule, ["contracts", "platform/ports"])).toEqual([]);
  });

  it("contracts depend on nothing", () => {
    expect(forbiddenImports((f) => f.component === "contracts", [])).toEqual([]);
  });

  it("ports only depend on contracts", () => {
    expect(forbiddenImports((f) => f.component === "platform/ports", ["contracts"])).toEqual([]);
  });

  it("adapters only depend on ports and contracts", () => {
    expect(forbiddenImports((f) => f.component === "platform/adapters", ["contracts", "platform/ports"])).toEqual([]);
  });

  it("only app.module.ts knows the concrete adapters", () => {
    const usersOfAdapters = files
      .filter((f) => f.component !== "platform/adapters")
      .filter((f) => f.imports.some((target) => componentByPath.get(target) === "platform/adapters"))
      .map((f) => f.path);
    expect(usersOfAdapters).toEqual(["app.module.ts"]);
  });

  it("code outside a feature module only imports its *.module.ts file", () => {
    const internalAccess = files.flatMap((file) =>
      file.imports
        .filter((target) => {
          const targetComponent = componentByPath.get(target)!;
          const isOtherModule = targetComponent.startsWith("modules/") && targetComponent !== file.component;
          return isOtherModule && !target.endsWith(".module.ts");
        })
        .map((target) => `${file.path} -> ${target}`),
    );
    expect(internalAccess).toEqual([]);
  });
});
