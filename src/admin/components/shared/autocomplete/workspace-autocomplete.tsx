import { FC, useMemo, useState } from 'react';

import { VStack } from '@chakra-ui/react';

import { AutocompleteMenu, FormLabel } from '@miruni/eds';
import { useSearchWorkspacesLazyQuery } from '@miruni/graphql';
import { IAutocompleteOption } from '@miruni/models';

import { useMiruniUser } from '#/admin/hooks/use-miruni-user';

import { autocompleteDropdownStyles } from './styles';
import { logError } from '#/admin/utils/logging';

let workspaceAbortController = new AbortController();

export interface WorkspaceOptionWithTeamId {
  id: number;
  label: string;
  teamId: number;
}

interface WorkspaceAutocompleteProps {
  onWorkspaceSelect: (workspace: WorkspaceOptionWithTeamId | null) => void;
  selectedWorkspace: WorkspaceOptionWithTeamId | null;
  showLabel?: boolean;
}

export const WorkspaceAutocomplete: FC<WorkspaceAutocompleteProps> = ({
  onWorkspaceSelect,
  selectedWorkspace,
  showLabel,
}) => {
  const [workspaceInputValue, setWorkspaceInputValue] = useState('');
  const { userWorkspaces } = useMiruniUser();

  const [searchWorkspaces, { data: searchWorkspacesData, loading: searchWorkspacesLoading }] =
    useSearchWorkspacesLazyQuery();

  const workspaceOptions: IAutocompleteOption[] = useMemo(() => {
    if (searchWorkspacesData) {
      return (
        searchWorkspacesData?.workspaces?.nodes?.map((workspace) => ({
          id: workspace.id,
          label: workspace.workspaceName || '',
        })) ?? []
      );
    }
    const userWorkspaceOptions = userWorkspaces.map((workspace) => ({
      id: workspace.id,
      label: workspace.workspaceName || '',
    }));
    const selectedWorkspaceNotInUserWorkspaces =
      selectedWorkspace && !userWorkspaces.find((w) => w.id === selectedWorkspace.id);
    if (selectedWorkspaceNotInUserWorkspaces) {
      return [
        {
          id: selectedWorkspace.id,
          label: selectedWorkspace.label,
        },
        ...userWorkspaceOptions,
      ];
    }
    return userWorkspaceOptions;
  }, [userWorkspaces, selectedWorkspace, searchWorkspacesData]);

  const selectedWorkspaceOption = selectedWorkspace
    ? [
        {
          id: selectedWorkspace.id,
          label: selectedWorkspace.label,
        },
      ]
    : undefined;

  const onWorkspaceInputChange = (value: string) => {
    workspaceAbortController.abort();
    workspaceAbortController = new AbortController();
    setWorkspaceInputValue(value);
    if (value.length < 1) {
      return;
    }
    searchWorkspaces({
      variables: {
        searchTerm: value,
        includeTeams: true,
      },
      context: {
        fetchOptions: {
          signal: workspaceAbortController.signal,
        },
      },
    }).catch(logError);
  };

  const getWorkspaceTeamId = (workspaceId: number) => {
    const workspace = userWorkspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      return workspace.teamId;
    }
    return searchWorkspacesData?.workspaces?.nodes?.find((w) => w.id === workspaceId)?.teams
      ?.nodes?.[0]?.id;
  };

  return (
    <VStack align="stretch" spacing={3}>
      {showLabel && <FormLabel color="gray.700">Select Workspace</FormLabel>}
      <AutocompleteMenu
        isLoading={searchWorkspacesLoading}
        options={workspaceOptions}
        placeholder="Select a workspace"
        inputValue={workspaceInputValue || undefined}
        onInputChange={onWorkspaceInputChange}
        onChange={(value) => {
          if (value && !('id' in value)) {
            throw new Error('Unexpected value');
          }

          const workspace = value
            ? {
                id: Number(value.id),
                label: value.label as string,
                teamId: getWorkspaceTeamId(Number(value.id)) as number,
              }
            : null;

          onWorkspaceSelect(workspace);
          setWorkspaceInputValue('');
        }}
        value={selectedWorkspaceOption}
        isClearable={!!workspaceInputValue}
        chakraStyles={{
          ...autocompleteDropdownStyles,
          control: (provided) => ({
            ...provided,
            borderColor: 'fuchsia.900',
            _hover: { borderColor: 'fuchsia.900' },
          }),
        }}
      />
    </VStack>
  );
};
