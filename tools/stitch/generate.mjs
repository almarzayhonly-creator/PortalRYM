import fs from 'node:fs/promises'
import path from 'node:path'
import { stitch } from '@google/stitch-sdk'

const rawProject = String(process.env.STITCH_PROJECT_ID || '').trim()
const projectUrl = rawProject.match(/^https?:\/\/stitch\.withgoogle\.com\/projects\/([^/?#]+)/i)
const projectId = projectUrl ? projectUrl[1] : rawProject
const rawPrompts = String(process.env.STITCH_DESIGN_PROMPTS || '').trim()

if (!process.env.STITCH_API_KEY) throw new Error('STITCH_API_KEY is required.')
if (!projectId) throw new Error('STITCH_PROJECT_ID is required.')
if (!rawPrompts) throw new Error('STITCH_DESIGN_PROMPTS is required.')

const prompts = rawPrompts.split(/\r?\n---\r?\n/).map((prompt) => prompt.trim()).filter(Boolean)
if (prompts.length > 3) throw new Error('Limit each run to at most three Stitch screens.')

const slug = (value) => String(value || 'screen')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  .slice(0, 56) || 'screen'

const fetchAsset = async (url, filePath) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Stitch asset download failed: HTTP ${response.status}`)
  await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()))
}

const output = path.resolve('.stitch/generated')
await fs.mkdir(output, { recursive: true })
const manifest = { createdAt: new Date().toISOString(), projectId, screens: [] }

for (let index = 0; index < prompts.length; index++) {
  const prompt = prompts[index]
  console.log(`Generating Stitch screen ${index + 1}/${prompts.length}...`)
  const screen = await stitch.project(projectId).generate(prompt, 'DESKTOP')
  const screenId = String(screen.screenId || screen.id || `generated-${index + 1}`)
  const base = `${String(index + 1).padStart(2, '0')}-${slug(prompt.slice(0, 90))}`
  const htmlPath = path.join(output, `${base}.html`)
  const imagePath = path.join(output, `${base}.png`)
  await Promise.all([
    fetchAsset(await screen.getHtml(), htmlPath),
    fetchAsset(await screen.getImage(), imagePath),
  ])
  manifest.screens.push({ screenId, prompt, html: path.basename(htmlPath), image: path.basename(imagePath) })
}

await fs.writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated ${manifest.screens.length} screen(s) in the configured Stitch project.`)
