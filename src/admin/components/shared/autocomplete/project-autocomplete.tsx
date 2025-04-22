import { FC, useCallback, useMemo, useState, useEffect } from 'react';

import { VStack } from '@chakra-ui/react';

import { AutocompleteMenu, AutocompleteMenuChangeHandler, FormLabel } from '@miruni/eds';
import { useProjectsListQuery } from '@miruni/graphql';

import { logError } from '#/admin/utils/logging';

import { autocompleteDropdownStyles } from './styles';

export interface ProjectOption {
  id: number;
  label: string;
}

export type ProjectAutocompleteSelectHandler = (project: ProjectOption | null) => void;

interface ProjectAutocompleteProps {
  teamId?: number;
  onProjectSelect: ProjectAutocompleteSelectHandler;
  selectedProjectId?: number | null;
  showLabel?: boolean;
}

export const ProjectAutocomplete: FC<ProjectAutocompleteProps> = ({
  teamId,
  onProjectSelect,
  selectedProjectId,
  showLabel,
}) => {
  const [inputValue, setInputValue] = useState('');

  const {
    data: projectData,
    loading: projectsLoading,
    refetch: getProjects,
  } = useProjectsListQuery({
    fetchPolicy: 'cache-first',
    variables: {
      first: 10,
      searchTerm: '',
      teamId: teamId as number,
    },
    skip: !teamId,
  });

  useEffect(() => {
    if (teamId) {
      getProjects({
        first: 10,
        searchTerm: '',
        teamId,
      }).catch(logError);
      setInputValue('');
    }
  }, [getProjects, teamId]);

  const onProjectInputChange = (value: string) => {
    setInputValue(value);
    if (!teamId || value.length < 2) {
      return;
    }
    getProjects({
      first: 10,
      searchTerm: value,
      teamId,
    }).catch(logError);
  };

  const handleSelectProject = useCallback<AutocompleteMenuChangeHandler>(
    async (value) => {
      if (!value || (value && !('label' in value))) {
        throw new Error('Unexpected value');
      }

      onProjectSelect({
        id: value.id as number,
        label: value.label as string,
      });
    },
    [onProjectSelect],
  );

  const projectOptions = useMemo(
    () =>
      projectData?.projects?.nodes?.map((project) => ({
        id: project.id,
        label: project?.projectName || '',
      })) || [],
    [projectData],
  );

  const selectedProjectOption = useMemo(() => {
    if (!selectedProjectId) return undefined;
    const project = projectOptions.find((p) => p.id === selectedProjectId);
    return project ? [project] : undefined;
  }, [selectedProjectId, projectOptions]);

  return (
    <VStack align="stretch" spacing={3}>
      {showLabel && <FormLabel color="gray.700">Select Project</FormLabel>}
      <AutocompleteMenu
        isLoading={projectsLoading}
        options={projectOptions}
        placeholder="Search for existing project"
        inputValue={inputValue || undefined}
        onInputChange={onProjectInputChange}
        onChange={handleSelectProject}
        value={selectedProjectOption}
        isClearable={!!inputValue}
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
