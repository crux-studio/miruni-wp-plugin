import { useCallback } from 'react';

import { useCreateNewSnippetMutation, useCreateProjectWithSnippetMutation } from '@miruni/graphql';

import { WPClient } from '#/admin/services/wp-client';
import { logError } from '#/admin/utils/logging';

export const useCreateSnippet = () => {
  const [createProjectWithSnippetGql, { loading: createProjectWithSnippetLoading }] =
    useCreateProjectWithSnippetMutation({});
  const [createSnippetForExistingProjectGql, { loading: createSnippetForExistingProjectLoading }] =
    useCreateNewSnippetMutation({});

  const createProjectWithSnippet = useCallback(
    async (options: { teamId: number; workspaceId: number }) => {
      const { teamId, workspaceId } = options;
      const res = await createProjectWithSnippetGql({
        variables: {
          input: {
            inProjectName: window.miruniData.siteDomain,
            inTeamId: teamId,
            inWorkspaceId: workspaceId,
          },
        },
      });

      const newSnippetKey = res.data?.createProjectWithSnippet?.project?.snippets?.nodes?.[0]?.key;
      const newSecretKey =
        res.data?.createProjectWithSnippet?.project?.snippets?.nodes?.[0]?.secretKey;

      if (!newSnippetKey || !newSecretKey) {
        throw new Error('Snippet key not found');
      }
      window.miruniData.snippetApiKey = newSnippetKey;
      window.miruniData.snippetSecretKey = newSecretKey;
      await WPClient.saveApiKeyInWordpress(newSnippetKey, newSecretKey).catch(logError);

      return res.data?.createProjectWithSnippet?.project;
    },
    [],
  );

  const createSnippetForExistingProject = useCallback(
    async (options: { projectId: number; projectName: string }) => {
      const { projectId, projectName } = options;
      const res = await createSnippetForExistingProjectGql({
        variables: {
          input: {
            _projectId: projectId,
            _name: `${projectName} snippet`,
          },
        },
      });

      const newSnippetKey = res.data?.createSnippet?.snippet?.key;
      const newSecretKey = res.data?.createSnippet?.snippet?.secretKey;

      if (!newSnippetKey || !newSecretKey) {
        throw new Error('Snippet key not found');
      }
      window.miruniData.snippetApiKey = newSnippetKey;
      window.miruniData.snippetSecretKey = newSecretKey;
      await WPClient.saveApiKeyInWordpress(newSnippetKey, newSecretKey).catch(logError);
    },
    [],
  );
  return {
    createProjectWithSnippet,
    createSnippetForExistingProject,
    createSnippetForExistingProjectLoading,
    createProjectWithSnippetLoading,
  };
};
