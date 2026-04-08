// src/main/providers/models/claude.ts

import Anthropic from '@anthropic-ai/sdk'
import { v4 as uuidv4 } from 'uuid'
import type { ProofreadingIssue } from '@shared/types'
import type { ProofreadingProvider, PageContext } from '../types'
import { buildSystemPrompt } from '../prompt'
import { fixJsonNewlines, tryExtractJson } from '../json-repair'

interface RawIssue {
  description: string
  originalText: string
  suggestedFix: string
  confidence: number
  severity: 'critical' | 'warning' | 'note'
  category: 'Spelling' | 'Grammar' | 'Formatting' | 'Consistency' | 'Reference' | 'Other'
  explanation: string
}

export class ClaudeProvider implements ProofreadingProvider {
  name = 'claude'
  private client: Anthropic
  private model: string
  private customInstruction?: string

  constructor(apiKey: string, model = 'claude-sonnet-4-6', customInstruction?: string) {
    this.client = new Anthropic({ apiKey })
    this.model = model
    this.customInstruction = customInstruction
  }

  async proofread(text: string, context: PageContext): Promise<ProofreadingIssue[]> {
    const systemPrompt = buildSystemPrompt(this.customInstruction)

    const userMessage = `Chapter: ${context.chapter}
Page: ${context.pageTitle}
URL: ${context.pageUrl}

---

${text}`

    let response
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16384,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('401') || msg.includes('403') || (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('api key'))) {
        throw new Error(`[AUTH] Claude API key rejected: ${msg}`)
      }
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        throw new Error(`[RATE_LIMIT] Claude rate limit exceeded: ${msg}`)
      }
      if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) {
        throw new Error(`[TIMEOUT] Claude request failed: ${msg}`)
      }
      throw new Error(`[API_ERROR] Claude request failed: ${msg}`)
    }

    console.log(`[Claude] stop_reason: ${response.stop_reason}, usage: input=${response.usage.input_tokens} output=${response.usage.output_tokens}`)

    if (response.stop_reason === 'max_tokens') {
      console.error('[Claude] Response was truncated (hit max_tokens limit)')
      throw new Error(`[PARSE_ERROR] Claude response was cut off — the page may have too many issues`)
    }

    const block = response.content[0]
    if (!block || block.type !== 'text') return []

    let content = block.text.trim()

    console.log(`[Claude] Raw response length: ${content.length} chars`)
    console.log(`[Claude] First 200 chars: ${content.slice(0, 200)}`)
    console.log(`[Claude] Last 200 chars: ${content.slice(-200)}`)

    // Strip markdown fences if the model wrapped the JSON.
    // Use a greedy match to grab everything between the FIRST opening fence
    // and the LAST closing fence (the response may contain ``` inside JSON strings).
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*)```\s*$/)
    if (fenceMatch) {
      console.log('[Claude] Stripped markdown fences from response')
      content = fenceMatch[1].trim()
    }

    // Fix literal newlines/tabs inside JSON string values.
    // The model sometimes outputs real newlines instead of \n escape sequences.
    // Walk through char-by-char, tracking whether we're inside a JSON string.
    content = fixJsonNewlines(content)

    let rawIssues: RawIssue[]
    const extracted = tryExtractJson(content)
    if (extracted !== null) {
      const parsed = extracted as Record<string, unknown>
      rawIssues = Array.isArray(parsed) ? parsed : ((parsed.issues as RawIssue[]) ?? [])
    } else {
      try {
        const parsed = JSON.parse(content)
        rawIssues = Array.isArray(parsed) ? parsed : (parsed.issues ?? [])
      } catch (parseErr) {
        console.error(`[Claude] JSON parse failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
        console.error(`[Claude] Full response:\n${content}`)
        throw new Error(`[PARSE_ERROR] Claude returned an invalid response — the AI model did not produce valid JSON`)
      }
    }

    const now = new Date().toISOString()

    return rawIssues.map((raw) => ({
      id: uuidv4(),
      pageUrl: context.pageUrl,
      pageTitle: context.pageTitle,
      chapter: context.chapter,
      category: raw.category,
      severity: raw.severity,
      description: raw.description,
      originalText: raw.originalText,
      suggestedFix: raw.suggestedFix,
      explanation: raw.explanation,
      confidence: raw.confidence,
      status: 'open' as const,
      detectedAt: now
    }))
  }
}
