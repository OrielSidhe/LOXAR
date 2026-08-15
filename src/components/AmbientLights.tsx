import React from 'react';

const AmbientLights: React.FC = () => (
  <>
    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] animate-move-lights opacity-60"></div>
    <div className="absolute top-[40%] right-[0%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px] animate-move-lights animation-delay-2000 opacity-50"></div>
    <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[130px] animate-move-lights animation-delay-4000 opacity-40"></div>
  </>
);

AmbientLights.displayName = 'AmbientLights';

export default AmbientLights;
