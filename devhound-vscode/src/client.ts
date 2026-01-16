/**
 * DevHound Client
 *
 * The "Brain-Stem" that connects VS Code to the Sovereign Stack.
 * Communicates with ignite_server.js (Port 4000) via HMAC-signed requests.
 *
 * Part of Colony OS - The Neural Monolith
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface DiagnosticIssue {
    id: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    source: string;
    code?: string;
    fix?: ProposedFix;
}

export interface ProposedFix {
    title: string;
    description: string;
    edits: TextEdit[];
    isPreferred?: boolean;
}

export interface TextEdit {
    range: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    newText: string;
}

export interface ScanResult {
    status: 'SUCCESS' | 'ERROR' | 'PARTIAL';
    issues: DiagnosticIssue[];
    fixedContent?: string;
    metrics: {
        scanTimeMs: number;
        issuesFound: number;
        issuesFixed: number;
        ralphLoopPasses: number;
    };
    ledgerEntryId?: string;
}

export interface HealResult {
    status: 'SUCCESS' | 'ERROR' | 'NO_CHANGES';
    originalContent: string;
    healedContent: string;
    changesSummary: string[];
    metrics: {
        healTimeMs: number;
        changesApplied: number;
        ralphLoopPasses: number;
    };
    ledgerEntryId?: string;
}

export interface BridgeStatus {
    connected: boolean;
    version: string;
    uptime: number;
    ledgerEntries: number;
    lastActivity: string;
}

// ============================================================================
// DevHound Client
// ============================================================================

export class DevHoundClient {
    private static instance: DevHoundClient;
    private axiosInstance: AxiosInstance;
    private baseUrl: string;
    private hmacSecret: string;
    private connected: boolean = false;
    private lastPing: number = 0;

    private constructor(baseUrl: string, hmacSecret: string = '') {
        this.baseUrl = baseUrl;
        this.hmacSecret = hmacSecret;
        this.axiosInstance = axios.create({
            baseURL: baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-DevHound-Client': 'vscode-extension',
                'X-DevHound-Version': '0.1.0'
            }
        });

        // Add request interceptor for HMAC signing
        this.axiosInstance.interceptors.request.use((config) => {
            if (this.hmacSecret && config.data) {
                const timestamp = Date.now().toString();
                const payload = JSON.stringify(config.data) + timestamp;
                const signature = crypto
                    .createHmac('sha256', this.hmacSecret)
                    .update(payload)
                    .digest('hex');

                config.headers['X-DevHound-Timestamp'] = timestamp;
                config.headers['X-DevHound-Signature'] = signature;
            }
            return config;
        });
    }

    static getInstance(baseUrl?: string, hmacSecret?: string): DevHoundClient {
        if (!DevHoundClient.instance) {
            DevHoundClient.instance = new DevHoundClient(
                baseUrl || 'http://localhost:4000',
                hmacSecret || ''
            );
        }
        return DevHoundClient.instance;
    }

    static updateConfig(baseUrl: string, hmacSecret: string): void {
        if (DevHoundClient.instance) {
            DevHoundClient.instance.baseUrl = baseUrl;
            DevHoundClient.instance.hmacSecret = hmacSecret;
            DevHoundClient.instance.axiosInstance.defaults.baseURL = baseUrl;
        }
    }

    async ping(): Promise<BridgeStatus | null> {
        try {
            const response = await this.axiosInstance.get('/api/status');
            this.connected = true;
            this.lastPing = Date.now();
            return response.data;
        } catch (error) {
            this.connected = false;
            console.error('[DevHound] Bridge offline:', this.formatError(error));
            return null;
        }
    }

    async scanFile(content: string, fileName: string): Promise<ScanResult | null> {
        try {
            const response = await this.axiosInstance.post('/api/enforce', {
                command: 'SCAN',
                parameters: {
                    filePath: fileName,
                    content: content,
                    language: this.detectLanguage(fileName)
                }
            });
            this.connected = true;
            return response.data;
        } catch (error) {
            this.connected = false;
            console.error('[DevHound] Scan failed:', this.formatError(error));
            return null;
        }
    }

    async healFile(content: string, fileName: string): Promise<HealResult | null> {
        try {
            const response = await this.axiosInstance.post('/api/enforce', {
                command: 'SCAN_AND_REPAIR',
                parameters: {
                    filePath: fileName,
                    content: content,
                    language: this.detectLanguage(fileName),
                    maxPasses: 3
                }
            });
            this.connected = true;
            return response.data;
        } catch (error) {
            this.connected = false;
            console.error('[DevHound] Heal failed:', this.formatError(error));
            return null;
        }
    }

    async applyFix(fix: ProposedFix, content: string, fileName: string): Promise<string | null> {
        try {
            const response = await this.axiosInstance.post('/api/enforce', {
                command: 'APPLY_FIX',
                parameters: {
                    filePath: fileName,
                    content: content,
                    fix: fix
                }
            });
            return response.data.output;
        } catch (error) {
            console.error('[DevHound] Apply fix failed:', this.formatError(error));
            return null;
        }
    }

    async logToLedger(action: string, details: Record<string, unknown>): Promise<boolean> {
        try {
            await this.axiosInstance.post('/api/ledger', {
                action,
                details,
                timestamp: new Date().toISOString(),
                source: 'devhound-vscode'
            });
            return true;
        } catch (error) {
            console.error('[DevHound] Ledger log failed:', this.formatError(error));
            return false;
        }
    }

    isConnected(): boolean {
        if (Date.now() - this.lastPing > 60000) {
            return false;
        }
        return this.connected;
    }

    private detectLanguage(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const languageMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescriptreact',
            'js': 'javascript',
            'jsx': 'javascriptreact',
            'py': 'python',
            'rs': 'rust',
            'go': 'go',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'h': 'c',
            'hpp': 'cpp',
            'cs': 'csharp',
            'rb': 'ruby',
            'php': 'php',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'vue': 'vue',
            'svelte': 'svelte',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'sql': 'sql',
            'sh': 'shellscript',
            'bash': 'shellscript',
            'zsh': 'shellscript'
        };
        return languageMap[ext] || 'plaintext';
    }

    private formatError(error: unknown): string {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            if (axiosError.code === 'ECONNREFUSED') {
                return 'Neural Bridge offline (connection refused)';
            }
            if (axiosError.response) {
                return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
            }
            return axiosError.message;
        }
        return String(error);
    }
}
