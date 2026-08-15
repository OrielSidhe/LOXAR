import React from 'react';
import BatchActionToolbar from './BatchActionToolbar';

export interface AppBatchToolbarProps {
  selectedCount: number;
  customFunctions: string[];
  onClearSelection: () => void;
  onBatchDelete: () => void;
  onBatchChangeFunction: (fn: string) => void;
}

const AppBatchToolbar: React.FC<AppBatchToolbarProps> = ({
  selectedCount,
  customFunctions,
  onClearSelection,
  onBatchDelete,
  onBatchChangeFunction,
}) => (
  <BatchActionToolbar
    selectedCount={selectedCount}
    customFunctions={customFunctions}
    onClearSelection={onClearSelection}
    onBatchDelete={onBatchDelete}
    onBatchChangeFunction={onBatchChangeFunction}
  />
);

AppBatchToolbar.displayName = 'AppBatchToolbar';

export default AppBatchToolbar;
