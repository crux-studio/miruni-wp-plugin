import { useEffect, useState } from 'react';

import { OnboardingModal } from '#/admin/components/onboarding/onboarding-modal';
import { WPClient, OnboardingStatus } from '#/admin/services/wp-client';

import { DashboardStoryView } from './story-table';

export const StoryTableDashboardPage = () => {
  // assume onboarding is complete by default
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(
    OnboardingStatus.COMPLETE,
  );

  useEffect(() => {
    WPClient.getOnboardingStatus().then((status) => {
      setOnboardingStatus(status ?? null);
    });
  }, []);

  return (
    <>
      <DashboardStoryView />
      {!onboardingStatus && (
        <OnboardingModal onCompleted={() => setOnboardingStatus(OnboardingStatus.COMPLETE)} />
      )}
    </>
  );
};
