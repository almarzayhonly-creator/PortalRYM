import fs from "node:fs/promises";
import { stitch } from "@google/stitch-sdk";

const mode = process.env.STITCH_MODE || "list";
const id = (process.env.STITCH_PROJECT_ID || "").trim();
const prompt = (process.env.STITCH_PROMPT || "").trim();
const dir = "stitch-output";
await fs.mkdir(dir, { recursive: true });

if (!process.env.STITCH_API_KEY) throw new Error("STITCH_API_KEY is not configured");

if (mode === "list") {
  const projects = await stitch.projects();
  const result = [];
  for (const p of projects) {
    result.push({ id: p.projectId || p.id });
  }
  await fs.writeFile(`${dir}/projects.json`, JSON.stringify(result, null, 2));
  console.log(`Stitch connection verified; visible projects: ${result.length}`);
} else if (mode === "generate") {
  if (!id || !prompt) throw new Error("Generation requires project_id and prompt");
  const project = stitch.project(id);
  const generation = await project.generate(prompt, { deviceType: "DESKTOP" });
  const screen = generation.first;
  if (!screen) throw new Error("Stitch returned no screens");
  await fs.writeFile(`${dir}/screen.html`, await screen.getHtml());
  await fs.writeFile(`${dir}/screen.png`, await screen.getImage());
  await fs.writeFile(`${dir}/result.json`, JSON.stringify({ projectId: id, screenId: screen.id }, null, 2));
  console.log("Generated Stitch screen; output saved as Actions artifact");
} else {
  throw new Error("Unknown mode");
}
