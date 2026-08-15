import React from 'react';
import SplashScreen from './SplashScreen';
import WelcomeScreen from './WelcomeScreen';
import GuidedTour from './GuidedTour';

type AppWelcomeSectionProps = {
  splashFinished: boolean;
  onSplashFinish: () => void;
  showWelcome: boolean;
  onCreateLexicon: () => void;
  onContinue: () => void;
  onImport: (content: string) => void;
  onStartTour: () => void;
  isTourActive: boolean;
  tourSteps: any[];
  onTourEnd: () => void;
};

const AppWelcomeSection: React.FC<AppWelcomeSectionProps> = ({
  splashFinished,
  onSplashFinish,
  showWelcome,
  onCreateLexicon,
  onContinue,
  onImport,
  onStartTour,
  isTourActive,
  tourSteps,
  onTourEnd,
}) => {
  return (
    <>
      {!splashFinished && <SplashScreen onFinish={onSplashFinish} />}

      {showWelcome && (
        <WelcomeScreen
          onCreateLexicon={onCreateLexicon}
          onContinue={onContinue}
          onImport={onImport}
          onStartTour={onStartTour}
        />
      )}
      {isTourActive && <GuidedTour steps={tourSteps} onClose={onTourEnd} />}
    </>
  );
};

export default AppWelcomeSection;
