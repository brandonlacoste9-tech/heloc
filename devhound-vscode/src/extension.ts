/**
 * DevHound VS Code Extension
 *
 * 🐺 Autonomous code healing powered by the Ralph Loop.
 * Part of Colony OS - The Neural Monolith
 */

import * as vscode from 'vscode';
import { DevHoundClient, DiagnosticIssue, ScanResult, HealResult } from './client';

// ============================================================================
// Global State
// ============================================================================

let statusBarItem: vscode.StatusBarItem;
let diagnosticCollection: vscode.DiagnosticCollection;
let client: DevHoundClient;
let autoFixEnabled: boolean = false;
let outputChannel: vscode.OutputChannel;

// ============================================================================
// Extension Activation
// ============================================================================

export function activate(context: vscode.ExtensionContext) {
    console.log('🐺 DevHound is awakening...');

    outputChannel = vscode.window.createOutputChannel('DevHound');
    log('DevHound extension activated');

    diagnosticCollection = vscode.languages.createDiagnosticCollection('devhound');
    context.subscriptions.push(diagnosticCollection);

    initializeClient();

    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'devhound.showStatus';
    context.subscriptions.push(statusBarItem);
    updateStatusBar('initializing');

    context.subscriptions.push(
        vscode.commands.registerCommand('devhound.scanFile', scanCurrentFile),
        vscode.commands.registerCommand('devhound.healFile', healCurrentFile),
        vscode.commands.registerCommand('devhound.toggleAutoFix', toggleAutoFix),
        vscode.commands.registerCommand('devhound.showStatus', showStatus)
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(onConfigChange)
    );

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(onDocumentSave)
    );

    checkConnection();

    const connectionChecker = setInterval(() => checkConnection(), 30000);
    context.subscriptions.push({
        dispose: () => clearInterval(connectionChecker)
    });

    log('DevHound ready. Press Ctrl+Shift+D to scan, Ctrl+Shift+H to heal.');
}

export function deactivate() {
    log('DevHound deactivating...');
    diagnosticCollection.clear();
}

// ============================================================================
// Commands
// ============================================================================

async function scanCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const document = editor.document;
    log(`Scanning: ${document.fileName}`);
    updateStatusBar('scanning');

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '🐺 DevHound scanning...',
        cancellable: false
    }, async (progress) => {
        progress.report({ message: 'Running diagnostics...' });

        const result = await client.scanFile(
            document.getText(),
            document.fileName
        );

        if (result) {
            displayDiagnostics(document.uri, result);
            updateStatusBar('ready');

            const issueCount = result.issues.length;
            if (issueCount === 0) {
                vscode.window.showInformationMessage('✅ No issues found!');
            } else {
                vscode.window.showInformationMessage(
                    `🐺 Found ${issueCount} issue(s). Use Ctrl+Shift+H to auto-heal.`
                );
            }

            log(`Scan complete: ${issueCount} issues found in ${result.metrics.scanTimeMs}ms`);
        } else {
            updateStatusBar('offline');
            vscode.window.showErrorMessage(
                '🐺 DevHound: Neural Bridge offline. Is the mock server running?'
            );
        }
    });
}

async function healCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    const document = editor.document;
    log(`Healing: ${document.fileName}`);
    updateStatusBar('healing');

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '🐺 DevHound healing...',
        cancellable: false
    }, async (progress) => {
        progress.report({ message: 'Running Ralph Loop...' });

        const result = await client.healFile(
            document.getText(),
            document.fileName
        );

        if (result) {
            if (result.status === 'SUCCESS' && result.healedContent !== result.originalContent) {
                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                edit.replace(document.uri, fullRange, result.healedContent);
                await vscode.workspace.applyEdit(edit);

                diagnosticCollection.delete(document.uri);

                updateStatusBar('ready');
                vscode.window.showInformationMessage(
                    `✅ Ralph healed your code! (${result.metrics.changesApplied} fixes in ${result.metrics.healTimeMs}ms)`
                );

                log(`Heal complete: ${result.metrics.changesApplied} changes in ${result.metrics.ralphLoopPasses} passes`);
            } else if (result.status === 'NO_CHANGES') {
                updateStatusBar('ready');
                vscode.window.showInformationMessage('✅ Code is already healthy!');
            } else {
                updateStatusBar('ready');
                vscode.window.showWarningMessage('⚠️ Some issues could not be auto-fixed.');
            }
        } else {
            updateStatusBar('offline');
            vscode.window.showErrorMessage(
                '🐺 DevHound: Neural Bridge offline. Is the mock server running?'
            );
        }
    });
}

async function toggleAutoFix(): Promise<void> {
    autoFixEnabled = !autoFixEnabled;

    const config = vscode.workspace.getConfiguration('devhound');
    await config.update('autoFixOnSave', autoFixEnabled, vscode.ConfigurationTarget.Global);

    if (autoFixEnabled) {
        vscode.window.showInformationMessage('🐺 Auto-fix on save: ENABLED');
        log('Auto-fix enabled');
    } else {
        vscode.window.showInformationMessage('🐺 Auto-fix on save: DISABLED');
        log('Auto-fix disabled');
    }

    updateStatusBar(client.isConnected() ? 'ready' : 'offline');
}

async function showStatus(): Promise<void> {
    const status = await client.ping();

    if (status) {
        const uptimeHours = Math.floor(status.uptime / 3600);
        const uptimeMinutes = Math.floor((status.uptime % 3600) / 60);

        vscode.window.showInformationMessage(
            `🐺 DevHound Status\n` +
            `• Bridge: Connected (v${status.version})\n` +
            `• Uptime: ${uptimeHours}h ${uptimeMinutes}m\n` +
            `• Ledger entries: ${status.ledgerEntries}\n` +
            `• Auto-fix: ${autoFixEnabled ? 'ON' : 'OFF'}`,
            { modal: true }
        );
    } else {
        const action = await vscode.window.showErrorMessage(
            '🐺 DevHound: Neural Bridge offline',
            'Retry',
            'Open Settings'
        );

        if (action === 'Retry') {
            checkConnection();
        } else if (action === 'Open Settings') {
            vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'devhound'
            );
        }
    }
}

// ============================================================================
// Event Handlers
// ============================================================================

async function onDocumentSave(document: vscode.TextDocument): Promise<void> {
    if (!autoFixEnabled) {
        return;
    }

    const supportedLanguages = [
        'typescript', 'typescriptreact', 'javascript', 'javascriptreact',
        'python', 'rust', 'go', 'java', 'c', 'cpp'
    ];

    if (!supportedLanguages.includes(document.languageId)) {
        return;
    }

    log(`Auto-fix triggered for: ${document.fileName}`);

    const result = await client.healFile(
        document.getText(),
        document.fileName
    );

    if (result && result.status === 'SUCCESS' && result.healedContent !== result.originalContent) {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        edit.replace(document.uri, fullRange, result.healedContent);
        await vscode.workspace.applyEdit(edit);
        await document.save();

        diagnosticCollection.delete(document.uri);

        vscode.window.setStatusBarMessage(
            `🐺 DevHound fixed ${result.metrics.changesApplied} issue(s)`,
            3000
        );

        log(`Auto-fixed ${result.metrics.changesApplied} issues`);
    }
}

function onConfigChange(event: vscode.ConfigurationChangeEvent): void {
    if (event.affectsConfiguration('devhound')) {
        initializeClient();
        checkConnection();
    }
}

// ============================================================================
// Helpers
// ============================================================================

function initializeClient(): void {
    const config = vscode.workspace.getConfiguration('devhound');
    const bridgeUrl = config.get<string>('bridgeUrl') || 'http://localhost:4000';
    const hmacSecret = config.get<string>('hmacSecret') || '';
    autoFixEnabled = config.get<boolean>('autoFixOnSave') || false;

    client = DevHoundClient.getInstance(bridgeUrl, hmacSecret);
    DevHoundClient.updateConfig(bridgeUrl, hmacSecret);

    log(`Client initialized: ${bridgeUrl}`);
}

async function checkConnection(): Promise<void> {
    const status = await client.ping();
    updateStatusBar(status ? 'ready' : 'offline');
}

function updateStatusBar(state: 'initializing' | 'scanning' | 'healing' | 'ready' | 'offline'): void {
    const config = vscode.workspace.getConfiguration('devhound');
    if (!config.get<boolean>('showStatusBar')) {
        statusBarItem.hide();
        return;
    }

    switch (state) {
        case 'initializing':
            statusBarItem.text = '$(sync~spin) DevHound';
            statusBarItem.tooltip = 'DevHound: Initializing...';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'scanning':
            statusBarItem.text = '$(search~spin) DevHound';
            statusBarItem.tooltip = 'DevHound: Scanning...';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            break;
        case 'healing':
            statusBarItem.text = '$(wand~spin) DevHound';
            statusBarItem.tooltip = 'DevHound: Running Ralph Loop...';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            break;
        case 'ready':
            const autoLabel = autoFixEnabled ? ' [AUTO]' : '';
            statusBarItem.text = `$(check) DevHound${autoLabel}`;
            statusBarItem.tooltip = `DevHound: Ready${autoFixEnabled ? ' (Auto-fix ON)' : ''}`;
            statusBarItem.backgroundColor = undefined;
            break;
        case 'offline':
            statusBarItem.text = '$(warning) DevHound';
            statusBarItem.tooltip = 'DevHound: Neural Bridge offline';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            break;
    }

    statusBarItem.show();
}

function displayDiagnostics(uri: vscode.Uri, result: ScanResult): void {
    const diagnostics: vscode.Diagnostic[] = result.issues.map((issue: DiagnosticIssue) => {
        const range = new vscode.Range(
            new vscode.Position(issue.line - 1, issue.column - 1),
            new vscode.Position(
                (issue.endLine || issue.line) - 1,
                (issue.endColumn || issue.column + 1) - 1
            )
        );

        const severity = mapSeverity(issue.severity);
        const diagnostic = new vscode.Diagnostic(range, issue.message, severity);
        diagnostic.source = 'DevHound';
        diagnostic.code = issue.code || issue.id;

        return diagnostic;
    });

    diagnosticCollection.set(uri, diagnostics);
}

function mapSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
        case 'error':
            return vscode.DiagnosticSeverity.Error;
        case 'warning':
            return vscode.DiagnosticSeverity.Warning;
        case 'info':
            return vscode.DiagnosticSeverity.Information;
        case 'hint':
            return vscode.DiagnosticSeverity.Hint;
        default:
            return vscode.DiagnosticSeverity.Information;
    }
}

function log(message: string): void {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] ${message}`);
}
