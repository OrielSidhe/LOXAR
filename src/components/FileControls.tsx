import React from 'react';
import UploadIcon from './icons/UploadIcon';
import DownloadIcon from './icons/DownloadIcon';
import SaveIcon from './icons/SaveIcon';
import InfoIcon from './icons/InfoIcon';
import FolderIcon from './icons/FolderIcon';
import RestoreIcon from './icons/RestoreIcon';
import PowerIcon from './icons/PowerIcon';
import Dropdown, { DropdownItem } from './Dropdown';
import MoreVerticalIcon from './icons/MoreVerticalIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import SparkleIcon from './icons/SparkleIcon';

interface FileControlsProps {
    onImport: (content: string) => void;
    onExport: (format: 'csv' | 'json') => void;
    onSave: () => void;
    onSetExportPath: () => void;
    onRestore: () => void;
    onOpenAbout: () => void;
    onStartTour: () => void;
    onOpenAiSettings: () => void;
    onQuit: () => void;
    onResetApp: () => void;
    onError: (message: string) => void;
    disabled?: boolean;
    isDirty?: boolean;
}

const FileControls = (props: FileControlsProps) => {
    const {
        onImport, onExport, onSave, onSetExportPath, onRestore,
        onOpenAbout, onStartTour, onOpenAiSettings, onQuit, onResetApp, onError,
        disabled = false, isDirty = false
    } = props;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const tryRead = (encoding: string, onFallback?: () => void) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target?.result as string;
                    if (!text) return;
                    if (text.includes('\uFFFD') && onFallback) {
                        onFallback();
                    } else {
                        onImport(text);
                    }
                };
                reader.onerror = () => onError("Error al leer el archivo.");
                reader.readAsText(file, encoding);
            };
            tryRead('UTF-8', () => tryRead('windows-1252'));
        }
        (event.target as HTMLInputElement).value = "";
    };

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* Primary Actions */}
            <label className="flex items-center gap-2 px-3 py-2 bg-background text-text-primary font-semibold rounded-md shadow-sm border border-subtle transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-accent cursor-pointer hover:bg-subtle">
                <UploadIcon className="h-5 w-5" /> Importar
                <input id="lexicon-import-file" name="lexiconImportFile" type="file" onChange={handleFileChange} accept=".csv,.txt,.json" className="hidden" />
            </label>

            <button
                onClick={onSave}
                disabled={disabled || !isDirty}
                className={`flex items-center gap-2 px-3 py-2 font-semibold rounded-md shadow-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed ${isDirty ? 'bg-success text-white border-success hover:bg-green-400' : 'bg-background text-text-secondary border-subtle'}`}
                title={isDirty ? 'Guardar cambios pendientes' : 'No hay cambios pendientes'}
            >
                <SaveIcon className="h-5 w-5" /> {isDirty ? 'Guardar*' : 'Guardado'}
            </button>

            {/* Export Dropdown */}
            <Dropdown
              trigger={
                <button disabled={disabled} className="flex items-center gap-2 px-3 py-2 bg-accent text-white font-semibold rounded-md shadow-sm hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-hover transition-colors disabled:bg-gray-600/50 disabled:cursor-not-allowed">
                    <DownloadIcon className="h-5 w-5" /> Exportar
                </button>
              }
            >
              <DropdownItem onClick={() => onExport('csv')}>
                <span className="font-bold">CSV</span> - Hoja de cálculo
              </DropdownItem>
              <DropdownItem onClick={() => onExport('json')}>
                <span className="font-bold">JSON</span> - Backup/Re-importar
              </DropdownItem>
            </Dropdown>

            {/* More Options Dropdown */}
            <Dropdown
              trigger={
                <button className="p-2 bg-background text-text-primary font-semibold rounded-md shadow-sm hover:bg-subtle border border-subtle focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors">
                    <MoreVerticalIcon className="h-5 w-5" />
                </button>
              }
            >
                <DropdownItem onClick={onSetExportPath}>
                    <div className="flex items-center gap-3">
                        <FolderIcon className="h-5 w-5" /> Configurar Carpeta
                    </div>
                </DropdownItem>
                <DropdownItem onClick={onRestore}>
                    <div className="flex items-center gap-3">
                        <RestoreIcon className="h-5 w-5" /> Restaurar Backup
                    </div>
                </DropdownItem>
                <DropdownItem onClick={onOpenAbout}>
                    <div className="flex items-center gap-3">
                        <InfoIcon className="h-5 w-5" /> Acerca de
                    </div>
                </DropdownItem>
                <DropdownItem onClick={onStartTour}>
                    <div className="flex items-center gap-3">
                        <InfoIcon className="h-5 w-5" /> Tour Guiado
                    </div>
                </DropdownItem>
                <DropdownItem onClick={onOpenAiSettings}>
                    <div className="flex items-center gap-3">
                        <SparkleIcon className="h-5 w-5" /> Configuración de IA
                    </div>
                </DropdownItem>

                <div className="my-1 border-t border-subtle"></div>

                <DropdownItem onClick={onResetApp}>
                    <div className="flex items-center gap-3 text-warning">
                        <AlertTriangleIcon className="h-5 w-5" /> Reiniciar Aplicación
                    </div>
                </DropdownItem>
                <DropdownItem onClick={onQuit}>
                    <div className="flex items-center gap-3 text-danger">
                        <PowerIcon className="h-5 w-5" /> Salir
                    </div>
                </DropdownItem>
            </Dropdown>
        </div>
    );
};

export default FileControls;
