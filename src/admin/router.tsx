import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PaymentStatus } from '@miruni/graphql';

import { useMiruniUser } from './hooks/use-miruni-user';
import { useWordPressNavigation, ViewName } from './hooks/use-wp-nav';
import { Layout } from './layout';
import { AIPreviewPage } from './pages/ai-preview';
import { CreatePlanPage } from './pages/create-plan';
import { Dashboard } from './pages/dashboard';
import { PaymentSuccess } from './pages/payment-success';
import { RenewPlanPage } from './pages/renew-plan';
import { Settings } from './pages/settings';

export const ViewRouter = () => {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'dashboard';
  const { paymentStatus } = useMiruniUser();
  const { goToView } = useWordPressNavigation();
  useEffect(() => {
    if (paymentStatus === PaymentStatus.None) {
      goToView(ViewName.CREATE_PLAN);
    } else if (paymentStatus === PaymentStatus.ExpiredOrCancelled) {
      goToView(ViewName.RENEW_PLAN);
    }
  }, [paymentStatus, goToView]);

  // Map view parameters to components
  const viewComponents = {
    [ViewName.DASHBOARD]: <Dashboard />,
    [ViewName.SETTINGS]: <Settings />,
    [ViewName.AI_PREVIEW]: <AIPreviewPage />,
    [ViewName.CREATE_PLAN]: <CreatePlanPage />,
    [ViewName.PAYMENT_SUCCESS]: <PaymentSuccess />,
    [ViewName.RENEW_PLAN]: <RenewPlanPage />,
  };

  // Render the appropriate component or fallback to dashboard
  return <Layout>{viewComponents[view] || viewComponents.dashboard}</Layout>;
};
