import { useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { createEmptyProject, projectToJson, projectFromJson, LOXAR_PROJECT_VERSION, type LoxarProject } from '../services/projectFile';
import { loadLexicon, listLexiconNames } from '../services/sqlStorage';
import { loadSessionCache, saveSessionCache } from '../services/sessionCache';
import type { LexiconEntry, LexiconMetadata, GenerationMode } from '../types';

export interface UseProjectOperationsOptions {
    activeLexicon: LexiconEntry[];
    activeLexiconName: string | null;
    activeMetadata: LexiconMetadata | null;
    activeGrammar: any;
    activeProfile: any;
    activeCustomFunctions: any[];
    themeId: any;
    exportPath: string | null;
    projectPath: string | null;
    isProjectDirty: boolean;
    isDirty: boolean;
    canvasState: { nodes: any[]; edges: any[] };
    sessionCacheData: { tourCompleted?: boolean } | null;
    activeTab: any;
    showNotification: (message: string, type: 'success' | 'error') => void;
    setIsLoading: (loading: boolean) => void;
    setLoadingMessage: (message: string) => void;
    setProjectPath: (path: string | null) => void;
    setCanvasState: (state: { nodes: any[]; edges: any[] }) => void;
    setIsProjectDirty: (dirty: boolean) => void;
    setProjectLastSaved: (date: Date | null) => void;
    setActiveTab: (tab: any) => void;
    setExportPath: (path: string | null) => void;
    setBackups: (backups: string[]) => void;
    lexicons: Record<string, any>;
    lexiconHook: {
        saveChanges: () => void;
        upsertLexiconData: (name: string, data: any) => void;
        updateGrammarManifest: (manifest: any) => void;
        updateGenerativeProfile: (profile: any) => void;
        updateNeographyProfile: (profile: any) => void;
        updateInflectionProfile: (profile: any) => void;
        updateCorpus: (corpus: any[]) => void;
        addCustomFunction: (fn: any) => void;
        startImportProcess: (content: string) => void;
        activeNeographyProfile: any;
        activeInflectionProfile: any;
        activeCorpus: any[];
    };
}

export function useProjectOperations(options: UseProjectOperationsOptions) {
    const {
        activeLexicon,
        activeLexiconName,
        activeMetadata,
        activeGrammar,
        activeProfile,
        activeCustomFunctions,
        themeId,
        exportPath,
        projectPath,
        isProjectDirty,
        isDirty,
        canvasState,
        sessionCacheData,
        activeTab,
        showNotification,
        setIsLoading,
        setLoadingMessage,
        setProjectPath,
        setCanvasState,
        setIsProjectDirty,
        setProjectLastSaved,
        setActiveTab,
        setExportPath,
        setBackups,
        lexicons,
        lexiconHook,
    } = options;

    const buildProjectPayload = useCallback((): LoxarProject => {
        return {
            version: LOXAR_PROJECT_VERSION,
            conlangName: activeMetadata?.conlangName || activeLexiconName || 'Léxico sin nombre',
            mainLanguage: activeMetadata?.mainLanguage || 'Español',
            updatedAt: new Date().toISOString(),
            lexicons,
            grammar: activeGrammar,
            generativeProfile: activeProfile,
            neographyProfile: lexiconHook.activeNeographyProfile,
            inflectionProfile: lexiconHook.activeInflectionProfile,
            corpus: lexiconHook.activeCorpus,
            customFunctions: activeCustomFunctions,
            settings: {
                themeId,
                soundsEnabled: true,
                autoBackupEnabled: !!exportPath,
                autoBackupMinutes: 15,
            },
            session: {
                activeTab,
                activeProfile: activeProfile ? activeProfile.sampleText.slice(0, 20) : null,
                tourCompleted: sessionCacheData?.tourCompleted,
            },
            canvas: canvasState,
        };
    }, [activeLexiconName, activeMetadata, lexicons, activeGrammar, activeProfile, activeCustomFunctions, themeId, exportPath, activeTab, sessionCacheData, canvasState, lexiconHook]);

    const writeProjectToPath = useCallback(async (path: string, payload: LoxarProject) => {
        const content = projectToJson(payload);
        await writeTextFile(path, content);
        setProjectLastSaved(new Date());
        setIsProjectDirty(false);
    }, [setProjectLastSaved, setIsProjectDirty]);

    const restoreProjectFromPath = useCallback(async (path: string) => {
        try {
            const raw = await readTextFile(path);
            const project = projectFromJson(raw);
            if (!project) return;
            if (project.lexicons) {
                Object.entries(project.lexicons).forEach(([name, data]) => {
                    lexiconHook.upsertLexiconData(name, data);
                });
            }
            if (project.grammar) lexiconHook.updateGrammarManifest(project.grammar);
            if (project.generativeProfile) lexiconHook.updateGenerativeProfile(project.generativeProfile);
            if (project.neographyProfile) lexiconHook.updateNeographyProfile(project.neographyProfile);
            if (project.inflectionProfile) lexiconHook.updateInflectionProfile(project.inflectionProfile);
            if (project.corpus?.length) lexiconHook.updateCorpus(project.corpus);
            if (project.customFunctions?.length) {
                project.customFunctions.forEach(fn => lexiconHook.addCustomFunction(fn));
            }
            if (project.session?.activeTab) setActiveTab(project.session.activeTab as any);
            if (project.canvas) setCanvasState({ nodes: project.canvas.nodes ?? [], edges: project.canvas.edges ?? [] });
        } catch (e) {
            console.error('Failed to restore project', e);
        }
    }, [lexiconHook, setActiveTab, setCanvasState]);

    const handleNewProject = useCallback(async () => {
        if (isProjectDirty && !window.confirm('Tienes cambios sin guardar. ¿Crear nuevo proyecto de todos modos?')) return;
        const name = window.prompt('Nombre del conlang para el nuevo proyecto:', 'Léxico sin nombre');
        if (!name) return;
        const selected = await save({ filters: [{ name: 'LOXAR Project', extensions: ['loxar'] }], defaultPath: `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'proyecto'}.loxar` });
        if (typeof selected !== 'string' || !selected) return;
        const project = createEmptyProject(name, 'Español');
        await writeProjectToPath(selected, project);
        setProjectPath(selected);
        setCanvasState({ nodes: [], edges: [] });
        saveSessionCache({ projectPath: selected, activeTab }).catch(console.error);
        showNotification(`Proyecto "${name}" creado.`, 'success');
    }, [isProjectDirty, writeProjectToPath, setProjectPath, setCanvasState, activeTab, showNotification]);

    const handleOpenProject = useCallback(async () => {
        if (isProjectDirty && !window.confirm('Tienes cambios sin guardar. ¿Abrir otro proyecto de todos modos?')) return;
        try {
            const selected = await open({ multiple: false, filters: [{ name: 'LOXAR Project', extensions: ['loxar'] }] });
            if (typeof selected !== 'string' || !selected) return;
            const raw = await readTextFile(selected);
            const project = projectFromJson(raw);
            if (!project) throw new Error('El archivo no es un proyecto LOXAR válido.');
            setCanvasState({ nodes: [], edges: [] });
            await restoreProjectFromPath(selected);
            setProjectPath(selected);
            setIsProjectDirty(false);
            setProjectLastSaved(new Date());
            saveSessionCache({ projectPath: selected, activeTab }).catch(console.error);
            showNotification(`Proyecto "${project.conlangName}" abierto.`, 'success');
        } catch (e) {
            showNotification(e instanceof Error ? e.message : 'No se pudo abrir el proyecto.', 'error');
        }
    }, [isProjectDirty, restoreProjectFromPath, setProjectPath, setIsProjectDirty, setProjectLastSaved, activeTab, showNotification]);

    const handleSaveProject = useCallback(async () => {
        if (!projectPath) {
            const selected = await save({ filters: [{ name: 'LOXAR Project', extensions: ['loxar'] }], defaultPath: `${activeMetadata?.conlangName || 'proyecto'}.loxar` });
            if (typeof selected !== 'string' || !selected) return;
            setProjectPath(selected);
            await writeProjectToPath(selected, buildProjectPayload());
            saveSessionCache({ projectPath: selected, activeTab }).catch(console.error);
            showNotification('Proyecto guardado.', 'success');
            return;
        }
        await writeProjectToPath(projectPath, buildProjectPayload());
        saveSessionCache({ projectPath, activeTab }).catch(console.error);
        showNotification('Cambios guardados en el proyecto.', 'success');
    }, [projectPath, buildProjectPayload, writeProjectToPath, activeMetadata?.conlangName, activeTab, setProjectPath, showNotification]);

    const handleSaveProjectAs = useCallback(async () => {
        const selected = await save({ filters: [{ name: 'LOXAR Project', extensions: ['loxar'] }], defaultPath: `${activeMetadata?.conlangName || 'proyecto'}.loxar` });
        if (typeof selected !== 'string' || !selected) return;
        setProjectPath(selected);
        await writeProjectToPath(selected, buildProjectPayload());
        saveSessionCache({ projectPath: selected, activeTab }).catch(console.error);
        showNotification('Proyecto guardado como.', 'success');
    }, [buildProjectPayload, writeProjectToPath, activeMetadata?.conlangName, activeTab, setProjectPath, showNotification]);

    const handleFileExport = useCallback(async (format: 'csv' | 'json' | 'txt') => {
        if (!exportPath || !activeLexiconName) {
            showNotification("Establece una carpeta de exportación primero.", "error"); return;
        }
        setIsLoading(true); setLoadingMessage(`Exportando a ${format.toUpperCase()}...`);
        try {
            let content = '';
            const safeName = activeLexiconName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${safeName}_${new Date().toISOString().split('T')[0]}.${format}`;

            if (format === 'json') content = JSON.stringify(activeLexicon, null, 2);
            else if (format === 'csv') {
                const rows = activeLexicon.map(e => ({
                    ID: e.ID,
                    Raíz: e.Raíz,
                    Léxema: e.Léxema.join(';'),
                    Categoría: e.Categoría,
                    Significado: e.Significado.join(';'),
                    externalID: e.externalID || '',
                }));
                content = '\uFEFF' + Papa.unparse(rows);
            }
            else content = activeLexicon.map(e => `${e.Léxema.join(', ')} (${e.Categoría}): ${e.Significado.join(', ')}`).join('\n');

            const { success, error } = await window.loxarBridge.exportFile({ filePath: `${exportPath}/${fileName}`, content });
            if (success) showNotification(`¡Éxito! Léxico exportado a ${fileName}`, 'success');
            else showNotification(`Error de exportación: ${error}`, 'error');
        } catch (e) {
            showNotification(`Error: ${e instanceof Error ? e.message : "Ocurrió un error desconocido."}`, 'error');
        }
        finally { setIsLoading(false); }
    }, [activeLexicon, activeLexiconName, exportPath, showNotification, setIsLoading, setLoadingMessage]);

    const handleSetExportPath = useCallback(async () => {
        const path = await window.loxarBridge.getDirectoryPath();
        if (path) {
            setExportPath(path);
            saveSessionCache({ exportPath: path, activeTab }).catch(console.error);
            showNotification('Carpeta de exportación establecida.', 'success');
        }
    }, [showNotification, activeTab, setExportPath]);

    const markProjectDirty = useCallback(() => setIsProjectDirty(true), [setIsProjectDirty]);

    const handleSaveChanges = useCallback(() => {
        lexiconHook.saveChanges();
        showNotification("Cambios guardados.", 'success');
        if (projectPath) {
            writeProjectToPath(projectPath, buildProjectPayload()).catch(() => {});
        }
        if (exportPath && activeLexiconName && lexicons[activeLexiconName]) {
            const date = new Date().toISOString().replace(/:/g, '-');
            const safeName = activeLexiconName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const backupPath = `${exportPath}/backup_${safeName}_${date}.json`;
            const content = JSON.stringify(lexicons[activeLexiconName]);
            window.loxarBridge.saveBackup({ backupPath, content })
                .then(({ success }) => {
                    if (success) {
                        showNotification(`Copia de seguridad de ${safeName} creada.`, "success");
                        window.loxarBridge.listBackups(exportPath).then(setBackups);
                    }
                }).catch(e => console.error("Auto-backup failed", e));
        }
    }, [lexiconHook, showNotification, exportPath, activeLexiconName, lexicons, projectPath, buildProjectPayload, writeProjectToPath, setBackups]);

    return {
        buildProjectPayload,
        writeProjectToPath,
        handleNewProject,
        handleOpenProject,
        handleSaveProject,
        handleSaveProjectAs,
        restoreProjectFromPath,
        handleFileExport,
        handleSetExportPath,
        handleSaveChanges,
        markProjectDirty,
    };
}
