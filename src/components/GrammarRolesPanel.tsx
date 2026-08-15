import React from 'react';
import type { SyntacticRole } from '../types';
import InfoHint from './InfoHint';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';

export interface GrammarRolesPanelProps {
  roles: SyntacticRole[];
  onAddRole: () => void;
  onRemoveRole: (id: string) => void;
  onUpdateRole: (id: string, field: 'name' | 'description', value: string) => void;
}

const GrammarRolesPanel = ({ roles, onAddRole, onRemoveRole, onUpdateRole }: GrammarRolesPanelProps) => {
  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">
            Roles Sintácticos
            <InfoHint text="Los roles son los papeles que juegan las palabras en una acción: quien hace (agente/sujeto), quien lo recibe (paciente/objeto), etc. Son la base para que el motor ordene la frase." />
          </h3>
          <button onClick={onAddRole} className="flex items-center gap-2 bg-primary hover:bg-primary-dark px-3 py-2 rounded-lg text-sm font-semibold text-white transition-colors">
            <PlusIcon className="w-4 h-4" />
            Añadir Rol
          </button>
        </div>
        <div className="space-y-2">
          {roles.map((role) => (
            <div key={role.id} className="bg-surface rounded-lg p-4 flex gap-4 items-start">
              <input
                type="text"
                value={role.name}
                onChange={(e) => onUpdateRole(role.id, 'name', e.target.value)}
                className="flex-1 bg-transparent border-b border-border-dark focus:border-primary outline-none text-white"
                placeholder="Nombre del rol..."
              />
              <input
                type="text"
                value={role.description || ''}
                onChange={(e) => onUpdateRole(role.id, 'description', e.target.value)}
                className="flex-2 bg-transparent border-b border-border-dark focus:border-primary outline-none text-text-secondary text-sm"
                placeholder="Descripción (opcional)..."
              />
              <button onClick={() => onRemoveRole(role.id)} className="p-1 text-text-secondary hover:text-red-400 transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          {roles.length === 0 && (
            <div className="text-center text-text-secondary py-8 italic">
              No hay roles definidos. Añade roles para empezar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

GrammarRolesPanel.displayName = 'GrammarRolesPanel';

export default GrammarRolesPanel;
