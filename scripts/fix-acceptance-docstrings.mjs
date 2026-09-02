import { readFileSync, writeFileSync, globSync } from 'node:fs'

/**
 * Cucumber doc strings strip the opening delimiter's indentation from each line.
 * Lines with less indentation than the delimiter lose their relative spacing.
 *
 * This script pads each doc-string content line so that, after Cucumber dedents,
 * the relative indentation in the written feature file is preserved.
 */
for (const file of globSync('tests/acceptance/features/*.feature')) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  const out = []
  let inDocstring = false
  let separatorIndent = 0
  let contentLines = []

  const flush = () => {
    if (contentLines.length === 0) return

    const nonEmpty = contentLines.filter((line) => line.trim().length > 0)
    const minIndent = Math.min(
      ...nonEmpty.map((line) => line.length - line.trimStart().length),
    )
    const extraPad = separatorIndent - minIndent

    for (const line of contentLines) {
      if (line.trim().length === 0) {
        out.push(line)
        continue
      }
      out.push(' '.repeat(extraPad) + line)
    }

    contentLines = []
  }

  for (const line of lines) {
    const trimmed = line.trimStart()
    const leading = line.length - trimmed.length

    if (!inDocstring && trimmed.startsWith('"""')) {
      separatorIndent = leading
      inDocstring = true
      out.push(line)
      continue
    }

    if (inDocstring && trimmed.startsWith('"""')) {
      flush()
      inDocstring = false
      out.push(line)
      continue
    }

    if (inDocstring) {
      contentLines.push(line)
      continue
    }

    out.push(line)
  }

  writeFileSync(file, out.join('\n'))
  console.log('fixed', file)
}
