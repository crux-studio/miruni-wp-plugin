import { FC, useState } from 'react';

import { OnboardingStatus, WPClient } from '#/admin/services/wp-client';

import { OnboardingFlowStropOne } from './step-one';
import { OnboardingFlowStepThree } from './step-three';
import { OnboardingFlowStepTwo } from './step-two';

const MAX_STEPS = 2;

interface OnboardingModalProps {
  onCompleted: () => void;
}

export const OnboardingModal: FC<OnboardingModalProps> = ({ onCompleted }) => {
  const [stepNumber, setStepNumber] = useState(0);
  const handleComplete = async () => {
    await WPClient.setOnboardingStatus(OnboardingStatus.COMPLETE);
    onCompleted();
  };

  const handleNext = () => {
    if (stepNumber < MAX_STEPS) {
      setStepNumber(stepNumber + 1);
    } else {
      void handleComplete();
    }
  };

  if (stepNumber === 0) {
    return <OnboardingFlowStropOne handleNext={handleNext} />;
  } else if (stepNumber === 1) {
    return <OnboardingFlowStepTwo handleNext={handleNext} />;
  } else if (stepNumber === 2) {
    return <OnboardingFlowStepThree handleNext={handleNext} />;
  }
};
