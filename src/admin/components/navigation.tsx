import { useSearchParams } from 'react-router-dom';

import { useWordPressNavigation, ViewName } from '#/admin/hooks/use-wp-nav';

export const Navigation = () => {
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'dashboard';
  const { goToView } = useWordPressNavigation();

  return (
    <nav className="miruni-admin-nav">
      <button
        onClick={() => goToView(ViewName.DASHBOARD)}
        className={currentView === ViewName.DASHBOARD ? 'active' : ''}
      >
        Dashboard
      </button>
      <button
        onClick={() => goToView(ViewName.SETTINGS)}
        className={currentView === ViewName.SETTINGS ? 'active' : ''}
      >
        Settings
      </button>
    </nav>
  );
};
