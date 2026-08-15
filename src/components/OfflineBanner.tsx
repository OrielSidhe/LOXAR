import React from 'react';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

const OfflineBanner: React.FC = () => (
  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-4 mx-4 mt-4 rounded-md shadow-sm">
    <div className="flex items-center">
      <AlertTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
      <div>
        <p className="font-semibold">Grammar engine running offline</p>
        <p className="text-sm">AI assistance is disabled. The local grammar engine is available for basic operations.</p>
      </div>
    </div>
  </div>
);

OfflineBanner.displayName = 'OfflineBanner';

export default OfflineBanner;
