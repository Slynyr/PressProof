import { ScanConfig } from "@shared/types";
import { ProofreadingProvider } from "./types";
import { OpenAIProvider } from "./models/openai";
import { ClaudeProvider } from "./models/claude";

export function createProvider(config: ScanConfig): ProofreadingProvider {
    switch (config.provider) {
        case 'openai':
            return new OpenAIProvider(config.apiKey, config.model, config.customInstructions)
        case 'claude':
            return new ClaudeProvider(config.apiKey, config.model, config.customInstructions,)
        default: 
            throw new Error(`Unknown provider: ${config.provider}`)
    }
}