import { useEffect, useState } from 'react';

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
    const [opacity, setOpacity] = useState(1);
    const [scale, setScale] = useState(0.95);

    useEffect(() => {
        // Start entrance animation
        setTimeout(() => setScale(1), 100);

        // Start exit animation
        const timer = setTimeout(() => {
            setOpacity(0);
            setScale(1.1);
        }, 3500);

        // Unmount
        const finishTimer = setTimeout(() => {
            onFinish();
        }, 4500);

        return () => {
            clearTimeout(timer);
            clearTimeout(finishTimer);
        };
    }, [onFinish]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a0a0c] pointer-events-none transition-all duration-1000 ease-in-out" style={{ opacity }}>
            <div className="text-center relative transition-transform duration-1000 ease-out" style={{ transform: `scale(${scale})` }}>
                {/* Glowing Orb Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>

                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-primary to-purple-500 font-display tracking-[0.2em] shadow-primary/50 relative z-10">
                    LOXAR
                </h1>

                {/* Tech Lines */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mt-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/80 w-1/3 h-full animate-pulse shadow-[0_0_10px_white]"></div>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
