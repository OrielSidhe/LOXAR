import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ElectronAPI } from './types';

// Tauri API imports
import { getVersion } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readDir, readTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { exit } from '@tauri-apps/plugin-process';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit, listen } from '@tauri-apps/api/event';

// Define the type for the API exposed by the preload script
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

// Polyfill window.electronAPI to map to Tauri native functionalities
// We keep the "electronAPI" name string to avoid refactoring hundreds of React hooks
const isTauriContext = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

if (isTauriContext) {
    const tauriAPI: Partial<ElectronAPI> = {
        getAppVersion: async () => await getVersion(),
        getDirectoryPath: async () => {
            const dir = await open({ directory: true });
            return dir ? (Array.isArray(dir) ? dir[0] : dir) : null;
        },
        exportFile: async ({ filePath, content }) => {
            try {
                await writeTextFile(filePath, content);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message || String(error) };
            }
        },
        saveBackup: async ({ backupPath, content }) => {
            try {
                // Tauri v2 lacks an instantaneous 'dirname', but we can split string manually or just ensure path
                const parts = backupPath.replace(/\\/g, '/').split('/');
                parts.pop(); // remove filename
                const dir = parts.join('/');
                const dirExists = await exists(dir);
                if (!dirExists && dir) {
                   await mkdir(dir, { recursive: true });
                }
                await writeTextFile(backupPath, content);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message || String(error) };
            }
        },
        listBackups: async (backupDir) => {
            try {
                const dirExists = await exists(backupDir);
                if (!dirExists) return [];
                const files = await readDir(backupDir);
                return files.filter(f => f.name?.endsWith('.json')).map(f => f.name as string);
            } catch (e) { return []; }
        },
        readBackupFile: async (filePath) => {
            return await readTextFile(filePath);
        },
        quitApp: () => {
            exit(0);
        },
        openWidget: () => {
            const webview = new WebviewWindow('widget', {
                url: 'widget.html',
                width: 350,
                height: 500,
                transparent: true,
                alwaysOnTop: true,
                decorations: false
            });
            webview.once('tauri://error', function (e: any) {
                console.error("Error creating widget window", e);
            });
        },
        send: (channel: string, data: any) => {
            emit(channel, data);
        },
        on: (channel: string, callback: (...args: any[]) => void) => {
            // listen returns a promise resolving to an unlisten function
            let unlistenFn: (() => void) | undefined;
            listen(channel, (event) => {
                callback(event.payload);
            }).then(fn => { unlistenFn = fn; });
            return () => {
                if (unlistenFn) unlistenFn();
            };
        },
        
        // Stubs for Gemini functions (these are now handled natively inside geminiService.ts,
        // but Typescript requires them for `ElectronAPI` compatibility interface).
        completeEntry: () => Promise.resolve(null),
        generateRootAndLexeme: () => Promise.resolve({ raiz: '', lexema: '' }),
        categorizeWords: () => Promise.resolve([]),
        generateBatchWords: () => Promise.resolve([]),
        batchDetermineCategory: () => Promise.resolve([]), // Updated name based on interface
        correctSignificado: (s) => Promise.resolve(s),
        cleanseJson: (t) => Promise.resolve(t),
        generateLanguageSample: () => Promise.resolve({ text: '', translation: '', newWords: [] }),
        conlangAgentChat: () => Promise.resolve({ reply: '' }),
        analyzePhonemes: () => Promise.resolve({ vowels: [], consonants: [], syllableStructures: [], consonantClusters: [], vowelClusters: [] }),
        analyzeAffixes: () => Promise.resolve([]),
        compileFont: () => Promise.resolve({ success: true, message: "Fuente compilada exitosamente (Simulado via Tauri)" })
    };
    
    window.electronAPI = tauriAPI as ElectronAPI;
} else {
    console.warn("Tauri API not found. Using simple web preview mock.");
    // Insert simple web mock
    const WEB_PREVIEW_ERROR = "Feature not available in web preview.";
    const reject = () => Promise.reject(new Error(WEB_PREVIEW_ERROR));

    window.electronAPI = {
        completeEntry: reject,
        generateRootAndLexeme: reject,
        categorizeWords: () => Promise.resolve([]),
        generateBatchWords: () => Promise.resolve([]),
        batchDetermineCategory: () => Promise.resolve([]),
        correctSignificado: (s:string) => Promise.resolve(s),
        cleanseJson: (t:string) => Promise.resolve(t),
        generateLanguageSample: reject,
        conlangAgentChat: reject,
        analyzePhonemes: () => Promise.resolve({ vowels: [], consonants: [], syllableStructures: [], consonantClusters: [], vowelClusters: [] }),
        analyzeAffixes: () => Promise.resolve([]),
        getAppVersion: () => Promise.resolve('web'),
        getDirectoryPath: () => Promise.resolve(null),
        exportFile: reject,
        saveBackup: reject,
        listBackups: () => Promise.resolve([]),
        readBackupFile: reject,
        quitApp: () => {},
        openWidget: () => {},
        send: () => {},
        on: () => () => {},
        compileFont: () => Promise.resolve({ success: false, error: WEB_PREVIEW_ERROR })
    } as unknown as ElectronAPI;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);