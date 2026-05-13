import { describe, it, expect } from "vitest"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkStringify from "remark-stringify"
import { remarkNoTables } from "./remark-no-tables"

function process(markdown: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkNoTables)
    .use(remarkStringify)
    .processSync(markdown)
  return String(result).trim()
}

const TABLE = `
| Name | Role |
| ---- | ---- |
| Alice | Engineer |
| Bob | Designer |
`.trim()

describe("remarkNoTables", () => {
  it("converts a table to a bullet list", () => {
    const out = process(TABLE)
    expect(out).not.toContain("|")
    expect(out).toContain("*")
  })

  it("prefixes each cell with its header in bold", () => {
    const out = process(TABLE)
    expect(out).toContain("**Name**")
    expect(out).toContain("**Role**")
    expect(out).toContain("Alice")
    expect(out).toContain("Engineer")
  })

  it("produces one list item per data row", () => {
    const out = process(TABLE)
    // Two data rows → two list items (lines starting with *)
    const items = out.split("\n").filter((l) => l.startsWith("*"))
    expect(items).toHaveLength(2)
  })

  it("leaves non-table markdown untouched", () => {
    const md = "## Heading\n\n- item one\n- item two"
    const out = process(md)
    expect(out).toContain("## Heading")
    expect(out).toContain("item one")
    expect(out).not.toContain("|")
  })

  it("handles a table with a single data row", () => {
    const single = "| A | B |\n| - | - |\n| x | y |"
    const out = process(single)
    const items = out.split("\n").filter((l) => l.startsWith("*"))
    expect(items).toHaveLength(1)
    expect(out).toContain("**A**")
    expect(out).toContain("x")
  })
})
