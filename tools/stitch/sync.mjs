import fs from 'node:fs/promises'
import path from 'node:path'
import { stitch } from '@google/stitch-sdk'

const root = path.resolve(import.meta.dirname, '../..')
const projectInput = String(process.env.STITCH_PROJECT_ID || '').trim()
const projectUrl = projectInput.match(/^https?:\/\/stitch\.withgoogle\.com\/projects\/([^/?#]+)/i)
const projectId = projectUrl ? projectUrl[1] : projectInput
if (!process.env.STITCH_API_KEY) throw new Error('STITCH_API_KEY is required.')
if (!projectId) throw new Error('STITCH_PROJECT_ID is required.')

const slug = (value) => String(value || 'screen')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  .slice(0, 64) || 'screen'

const project = stitch.project(projectId)
const screens = await project.screens()
const projectTitle = String(project.title || project.name || 'Portal RYM')
const out = path.join(root, '.stitch', 'projects', `rym-${slug(projectTitle)}`)
const screensDir = path.join(out, 'screens')
await fs.mkdir(screensDir, { recursive: true })

const manifest = { generatedAt: new Date().toISOString(), projectId, projectTitle, screens: [] }
for (let index = 0; index < screens.length; index++) {
  const screen = screens[index]
  const id = String(screen.screenId || screen.id || `screen-${index + 1}`)
  const title = String(screen.title || screen.displayName || screen.name || id)
  const base = `${String(index + 1).padStart(2, '0')}-${slug(title)}`
  const entry = { id, title, html: null, image: null, error: null }
  for (const [kind, getUrl, extension] of [
    ['html', () => screen.getHtml(), 'html'],
    ['image', () => screen.getImage(), 'png'],
  ]) {
    try {
      const url = await getUrl()
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Download failed: ${response.status}`)
      const relative = `screens/${base}.${extension}`
      const bytes = kind === 'html' ? Buffer.from(await response.text()) : Buffer.from(await response.arrayBuffer())
      await fs.writeFile(path.join(out, relative), bytes)
      entry[kind] = relative
    } catch (error) {
      const message = `${kind}: ${error instanceof Error ? error.message : String(error)}`
      entry.error = [entry.error, message].filter(Boolean).join(' | ')
    }
  }
  manifest.screens.push(entry)
  console.log(`Synced ${index + 1}/${screens.length}: ${title}`)
}

await fs.writeFile(path.join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Stitch snapshot ready: ${manifest.screens.length} screen(s).`)
