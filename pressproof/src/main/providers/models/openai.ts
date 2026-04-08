import OpenAI from "openai";
import {v4 as uuidv4 } from 'uuid'
import type { ProofreadingIssue } from "@shared/types";
import type { ProofreadingProvider, PageContext } from "../types";
import { buildSystemPrompt } from "../prompt";
import { fixJsonNewlines, tryExtractJson } from "../json-repair";

interface RawIssue {
    description: string
    originalText: string
    suggestedFix: string
    confidence: number
    severity: 'critical' | 'warning' | 'note'
    category: 'Spelling' | 'Grammar' | 'Formatting' | 'Consistency' | 'Reference' | 'Other'
    explanation: string
}

export class OpenAIProvider implements ProofreadingProvider { 
    name = 'openai'
    private client: OpenAI
    private model: string
    private customInstruction?: string

    constructor(apiKey: string, model = 'gpt-4o', customInstruction?: string) {
        this.client = new OpenAI({ apiKey })
        this.model = model
        this.customInstruction = customInstruction
    }

    async proofread(text: string, context: PageContext): Promise<ProofreadingIssue[]> {
        const systemPrompt = buildSystemPrompt(this.customInstruction)

        const userMessage = `Chapter ${context.chapter}
        Page: ${context.pageTitle}
        URL: ${context.pageUrl}
        
        ---
        
        ${text}`

        // Debug: log the exact payload being sent to OpenAI
        console.log('=== OPENAI REQUEST ===')
        console.log('--- SYSTEM PROMPT ---\n', systemPrompt)
        console.log('--- USER MESSAGE ---\n', userMessage)
        console.log('=====================')

        let response
        try {
            response = await this.client.chat.completions.create({
                model: this.model,
                temperature: 0.1,
                max_tokens: 16384,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ]
            })
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            if (msg.includes('401') || msg.includes('403') || (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('api key'))) {
                throw new Error(`[AUTH] OpenAI API key rejected: ${msg}`)
            }
            if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
                throw new Error(`[RATE_LIMIT] OpenAI rate limit exceeded: ${msg}`)
            }
            if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) {
                throw new Error(`[TIMEOUT] OpenAI request failed: ${msg}`)
            }
            throw new Error(`[API_ERROR] OpenAI request failed: ${msg}`)
        }

        if (response.choices[0].finish_reason === 'length') {
            console.error('OpenAI response was truncated (hit max_tokens limit)')
            throw new Error(`[PARSE_ERROR] OpenAI response was cut off — the page may have too many issues`)
        }

        const content = response.choices[0].message.content

        // Debug: log the raw response
        console.log('=== OPENAI RESPONSE ===')
        console.log(content)
        console.log('=======================')

        if (!content) return []

        // Strip markdown fences if the model wrapped the JSON
        let cleaned = content.trim()
        const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*)```\s*$/)
        if (fenceMatch) {
            cleaned = fenceMatch[1].trim()
        }

        cleaned = fixJsonNewlines(cleaned)

        let rawIssues: RawIssue[]
        const extracted = tryExtractJson(cleaned)
        if (extracted !== null) {
            const parsed = extracted as Record<string, unknown>
            rawIssues = Array.isArray(parsed) ? parsed : ((parsed.issues as RawIssue[]) ?? [])
        } else {
            try {
                const parsed = JSON.parse(cleaned)
                rawIssues = Array.isArray(parsed) ? parsed : (parsed.issues ?? [])
            } catch {
                console.error("OpenAI returned non-JSON response: ", content)
                throw new Error(`[PARSE_ERROR] OpenAI returned an invalid response — the AI model did not produce valid JSON`)
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