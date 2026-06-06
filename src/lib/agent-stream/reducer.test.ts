import { describe, it, expect } from "vitest"
import { patchById } from "./reducer"

type Item = { id: string; n: number; label?: string }

const items: Item[] = [
  { id: "a", n: 1 },
  { id: "b", n: 2 },
  { id: "c", n: 3 },
]

describe("patchById", () => {
  it("applies an object patch to the matching item only", () => {
    const result = patchById(items, "b", { n: 20, label: "hit" })
    expect(result).toEqual([
      { id: "a", n: 1 },
      { id: "b", n: 20, label: "hit" },
      { id: "c", n: 3 },
    ])
  })

  it("applies a function patch derived from the current item", () => {
    const result = patchById(items, "c", (item) => ({ n: item.n + 100 }))
    expect(result.find((i) => i.id === "c")?.n).toBe(103)
  })

  it("keeps non-matching items referentially stable (enables memoization)", () => {
    const result = patchById(items, "b", { n: 99 })
    expect(result[0]).toBe(items[0]) // untouched → same reference
    expect(result[2]).toBe(items[2])
    expect(result[1]).not.toBe(items[1]) // patched → new reference
  })

  it("returns a new array without mutating the input", () => {
    const result = patchById(items, "a", { n: 0 })
    expect(result).not.toBe(items)
    expect(items[0]).toEqual({ id: "a", n: 1 }) // original untouched
  })

  it("is a no-op (new array, same items) when no id matches", () => {
    const result = patchById(items, "missing", { n: 0 })
    expect(result).not.toBe(items)
    expect(result).toEqual(items)
    result.forEach((item, i) => expect(item).toBe(items[i]))
  })
})
