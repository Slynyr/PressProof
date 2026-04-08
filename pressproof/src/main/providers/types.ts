import type { ProofreadingIssue } from "@shared/types";

export interface PageContext {
    pageUrl: string 
    pageTitle: string
    chapter: string
}

export interface ProofreadingProvider {
    name: string 
    proofread(text: string, context: PageContext): Promise<ProofreadingIssue[]>
}