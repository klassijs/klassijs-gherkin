import Mocha from 'mocha'
import { glob } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mocha = new Mocha({ timeout: 10000 })

const files = await Array.fromAsync(glob('tests/unit/*.ts', { cwd: root }))
for (const file of files) {
  mocha.addFile(path.resolve(root, file))
}

await mocha.loadFilesAsync()
const failures = await new Promise((resolve) => mocha.run(resolve))
process.exitCode = failures ? 1 : 0
