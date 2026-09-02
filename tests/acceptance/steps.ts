import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { Given, DataTable, When, Then, After, Before } from '@cucumber/cucumber'
import { expect } from 'chai'
import { v4 } from 'uuid'

import { Runner } from '../../src/index'
import { GherklinConfiguration } from '../../src/types'
import path from 'node:path'

After(function () {
  delete process.env.GHERKLIN_FEATURE_FILES
  delete process.env.GHERKLIN_FEATURE_DIR

  if (Array.isArray(this.featureFiles)) {
    this.featureFiles.forEach((featureFile: string) => {
      if (existsSync(featureFile)) {
        rmSync(featureFile)
      }
    })
    this.featureFiles = []
  }
})

Before(function () {
  this.tmpLocation = path.resolve(import.meta.dirname, './tmp')
  if (existsSync(this.tmpLocation)) {
    rmSync(this.tmpLocation, { recursive: true, force: true })
  }
  mkdirSync(this.tmpLocation, { recursive: true })
  this.featureFiles = []
})

Given('the following feature file', function (featureContent: string): void {
  const featureFile = `${this.tmpLocation}/${v4()}.feature`
  this.featureFiles.push(featureFile)
  writeFileSync(featureFile, featureContent)
})

Given('the following feature file named {string}', function (name: string, featureContent: string): void {
  const featureFile = `${this.tmpLocation}/${name}.feature`
  this.featureFiles.push(featureFile)
  writeFileSync(featureFile, featureContent)
})

Given('the following feature files', function (table: DataTable): void {
  table.hashes().forEach((hash) => {
    const featureFile = `${this.tmpLocation}/${hash.name}.feature`
    this.featureFiles.push(featureFile)
    writeFileSync(featureFile, '')
  })
})

When('Gherklin is ran with the following configuration', async function (table: DataTable): Promise<void> {
  const config: GherklinConfiguration = {
    configDirectory: import.meta.dirname,
    reporter: {
      configDirectory: import.meta.dirname,
      type: 'null',
    },
  }

  table.hashes().forEach((hash) => {
    Object.keys(hash).forEach((key) => {
      const value = parse(hash[key])
      config[key] = value as unknown
    })
  })

  process.env.GHERKLIN_FEATURE_FILES = this.featureFiles.join(',')

  const runner = new Runner(config)
  await runner.init()
  this.runResult = await runner.run()
})

Then('there is/are {int} file(s) with errors', function (amount: number): void {
  expect(this.runResult.errors.size).to.eq(amount)
})

Then('the error(s) are/is', function (table: DataTable): void {
  const errors = []
  expect(this.runResult.errors.size).to.be.greaterThan(0)
  this.featureFiles.forEach((featureFile: string) => {
    if (this.runResult.errors.has(featureFile)) {
      errors.push(...this.runResult.errors.get(featureFile))
    }
  })
  const expectedErrors = []

  table.hashes().forEach((hash) => {
    const error = {
      message: hash.message,
      rule: hash.rule,
      location: parse(hash.location),
      severity: hash.severity,
    }
    expectedErrors.push(error)
  })

  const byLocation = (a: { location: { line: number; column: number } }, b: { location: { line: number; column: number } }) =>
    a.location.line !== b.location.line ? a.location.line - b.location.line : a.location.column - b.location.column
  errors.sort(byLocation)
  expectedErrors.sort(byLocation)
  expect(errors).to.deep.equal(expectedErrors)
})

Then('the file has the content', function (table: DataTable) {
  this.featureFiles.forEach((featureFile: string) => {
    const content = readFileSync(featureFile, { encoding: 'utf-8' })
    const lines = content.split(/\r\n|\r|\n/)
    table.hashes().forEach((hash) => {
      const line = lines[Number(hash.line) - 1]
      expect(line.trim()).to.eq(hash.content)
    })
  })
})

Then('the linter succeeds', function () {
  expect(this.runResult.success).to.eq(true)
})

Then('the linter fails', function () {
  expect(this.runResult.success).to.eq(false)
})

Then('there are {int} total errors', function (amount: number): void {
  expect(this.runResult.errorCount).to.eq(amount)
})

const parse = (value: string) => {
  if (value === 'true' || value === 'false') {
    return Boolean(value)
  }

  if (!isNaN(Number(value))) {
    return Number(value)
  }

  if (value.indexOf('[') === 0) {
    const parts = value.replace('[', '').replace(']', '').split(',')
    return parts.map((p) => {
      return parse(p.trim())
    })
  }
  if (value.indexOf('{') === 0) {
    return JSON.parse(value)
  }

  return value
}
