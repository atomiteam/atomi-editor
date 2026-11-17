import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }

export function serve() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1')
      const path = url.pathname === '/' ? '/demo/index.html' : decodeURIComponent(url.pathname)
      const file = resolve(root, '.' + path)
      if (!['demo', 'dist'].some(directory => file.startsWith(resolve(root, directory) + sep))) {
        response.writeHead(404).end()
        return
      }
      const body = await readFile(file)
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'text/plain' }).end(body)
    } catch {
      response.writeHead(404).end()
    }
  })
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const port = Number(process.env.PORT ?? 4173)
  serve().listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`))
}
