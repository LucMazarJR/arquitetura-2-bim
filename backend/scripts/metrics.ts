import path from "node:path";
import { analyzeProject, componentGraph } from "./dependencies";

const files = analyzeProject(path.resolve(__dirname, "../src"));
const graph = componentGraph(files);
const components = [...graph.keys()].sort();

const format = (n: number) => n.toFixed(2);

console.log("| Component | Ca | Ce | I | A | D |");
console.log("|---|---|---|---|---|---|");

for (const component of components) {
  const ce = graph.get(component)!.size;
  const ca = components.filter((other) => graph.get(other)!.has(component)).length;

  const own = files.filter((f) => f.component === component);
  const abstract = own.reduce((sum, f) => sum + f.abstractExports, 0);
  const total = own.reduce((sum, f) => sum + f.abstractExports + f.concreteExports, 0);

  const instability = ca + ce === 0 ? 0 : ce / (ca + ce);
  const abstractness = total === 0 ? 0 : abstract / total;
  const distance = Math.abs(abstractness + instability - 1);

  console.log(
    `| ${component} | ${ca} | ${ce} | ${format(instability)} | ${format(abstractness)} (${abstract}/${total}) | ${format(distance)} |`,
  );
}

console.log("\nDependencies:");
for (const component of components) {
  const dependencies = [...graph.get(component)!].sort().join(", ") || "(none)";
  console.log(`  ${component.padEnd(22)} -> ${dependencies}`);
}
