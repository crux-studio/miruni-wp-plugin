import { ProjectNotAvailablePrompt } from '#/admin/components/dashboard/project-not-available';
import { SettingsPageMenu } from '#/admin/components/settings/index';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

export const Settings = () => {
  const { userSnippet } = useMiruniUser();
  if (userSnippet && !userSnippet?.project) {
    return <ProjectNotAvailablePrompt />;
  }
  return <SettingsPageMenu />;
};
