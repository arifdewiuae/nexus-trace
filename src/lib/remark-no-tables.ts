import { visit } from "unist-util-visit"
import { toString } from "mdast-util-to-string"
import type { Root, Table, List, ListItem, Paragraph, PhrasingContent, Strong, Text } from "mdast"

/**
 * Remark plugin: converts table nodes to labelled bullet lists.
 * Each data row becomes a list item; cells are prefixed with **Header**: .
 * This is a hard enforcement layer — the system prompt instruction alone
 * is insufficient for comparison-type queries.
 */
export function remarkNoTables() {
  return (tree: Root) => {
    visit(tree, "table", (node: Table, index, parent) => {
      if (!parent || index === undefined) return

      const [headerRow, ...dataRows] = node.children
      const headers = headerRow.children.map((cell) => toString(cell))

      const listItems: ListItem[] = dataRows.map((row) => {
        const fields: Paragraph[] = row.children.map((cell, i) => {
          const header = headers[i]
          const cellContent = cell.children as PhrasingContent[]

          const children: PhrasingContent[] = header
            ? [
                { type: "strong", children: [{ type: "text", value: header }] } satisfies Strong,
                { type: "text", value: ": " } satisfies Text,
                ...cellContent,
              ]
            : cellContent

          return { type: "paragraph", children }
        })

        return { type: "listItem", spread: fields.length > 1, children: fields }
      })

      const list: List = { type: "list", ordered: false, spread: false, children: listItems }
      parent.children.splice(index, 1, list)
    })
  }
}
