import { ProjectNotAvailablePrompt } from '#/admin/components/dashboard/project-not-available';
import { SnippetCreationPrompt } from '#/admin/components/dashboard/snippet-creation-prompt';
import { StoryTableDashboardPage } from '#/admin/components/dashboard/story-table-page';
import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

export const Dashboard = () => {
  const { userSnippet, isLoading } = useMiruniUser();
  if (isLoading) {
    return null;
  }

  if (!userSnippet) {
    return <SnippetCreationPrompt />;
  }

  if (userSnippet && !userSnippet?.project) {
    return <ProjectNotAvailablePrompt />;
  }

  return <StoryTableDashboardPage />;
};
