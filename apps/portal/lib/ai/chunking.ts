import { createHash } from "node:crypto"

export type KnowledgeChunkDraft = {
  source: string
  heading: string
  content: string
}

const MAX_CHUNK_CHARS = 2_400

export function hashChunkContent(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

/** Split markdown on headings, then soft-split oversized sections. */
export function chunkMarkdownDocument(
  source: string,
  markdown: string
): KnowledgeChunkDraft[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const sections: Array<{ heading: string; body: string[] }> = []
  let currentHeading = "Overview"
  let currentBody: string[] = []

  for (const line of lines) {
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line)
    if (headingMatch) {
      if (currentBody.some((entry) => entry.trim().length > 0)) {
        sections.push({ heading: currentHeading, body: currentBody })
      }
      currentHeading = headingMatch[2].trim()
      currentBody = []
      continue
    }
    currentBody.push(line)
  }

  if (currentBody.some((entry) => entry.trim().length > 0)) {
    sections.push({ heading: currentHeading, body: currentBody })
  }

  const chunks: KnowledgeChunkDraft[] = []

  for (const section of sections) {
    const text = section.body.join("\n").trim()
    if (!text) continue

    if (text.length <= MAX_CHUNK_CHARS) {
      chunks.push({
        source,
        heading: section.heading,
        content: `${section.heading}\n\n${text}`,
      })
      continue
    }

    const pieces = softSplit(text, MAX_CHUNK_CHARS)
    pieces.forEach((piece, index) => {
      chunks.push({
        source,
        heading: `${section.heading} (${index + 1})`,
        content: `${section.heading}\n\n${piece}`,
      })
    })
  }

  return chunks
}

function softSplit(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n{2,}/)
  const pieces: string[] = []
  let buffer = ""

  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph
    if (candidate.length <= maxChars) {
      buffer = candidate
      continue
    }

    if (buffer) {
      pieces.push(buffer)
    }

    if (paragraph.length <= maxChars) {
      buffer = paragraph
    } else {
      for (let i = 0; i < paragraph.length; i += maxChars) {
        pieces.push(paragraph.slice(i, i + maxChars))
      }
      buffer = ""
    }
  }

  if (buffer) {
    pieces.push(buffer)
  }

  return pieces
}
