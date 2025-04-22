import { Reference, useApolloClient } from '@apollo/client';

import {
  StoriesConnection,
  Story,
  StoryDetailsFragmentDoc,
  TableViewStoryWithAiFragmentDoc,
  useStoryAddedSubscription,
  useStoryAiSuggestionBatchAddedSubscription,
} from '@miruni/graphql';

import { useWebsocketStories } from './use-websocket-stories';

export const useSubscriptions = () => {
  const client = useApolloClient();
  const { addWebsocketStory } = useWebsocketStories();

  useStoryAiSuggestionBatchAddedSubscription({
    onData: (data) => {
      const story = data?.data.data?.storyAiSuggestionBatchAdded?.story;
      if (!story) {
        return;
      }
      addWebsocketStory(story.id);

      // update apollo cache
      client.cache.modify({
        fields: {
          stories: (existingStoriesConnection) => {
            const existingStories = existingStoriesConnection.nodes || [];
            const existingStory =
              existingStories.find(
                (existingStory: StoriesConnection['nodes'][number]) =>
                  existingStory?.nodeId === story.nodeId,
              ) || {};
            const newStoryRef = client.cache.writeFragment({
              data: { ...existingStory, ...story, tags: [] },
              fragment: TableViewStoryWithAiFragmentDoc,
              fragmentName: 'TableViewStoryWithAI',
            });
            let isNewStory = true;

            const updatedStories = existingStories
              .map((existingStory: StoriesConnection['nodes'][number]) => {
                if (!existingStory) return existingStory;
                if (existingStory.nodeId === story.nodeId) {
                  isNewStory = false;
                  return story;
                }
                return existingStory;
              })
              .filter(Boolean) as unknown as Array<Story | Reference>; // filter out nulls
            if (isNewStory && newStoryRef) {
              updatedStories.unshift(newStoryRef);
            }
            return updatedStories;
          },
        },
      });
    },
  });

  useStoryAddedSubscription({
    onData: (data) => {
      const story = data?.data.data?.storyAdded?.story;
      if (!story) {
        return;
      }

      // update apollo cache
      client.cache.modify({
        fields: {
          stories: (existingStoriesConnection) => {
            const existingStories = existingStoriesConnection.nodes || [];
            const newStoryRef = client.cache.writeFragment({
              data: story,
              fragment: StoryDetailsFragmentDoc,
              fragmentName: 'StoryDetails',
            });
            let isNewStory = true;
            const updatedStories = existingStories
              .map((existingStory: StoriesConnection['nodes'][number]) => {
                if (!existingStory) return existingStory;
                if (existingStory.nodeId === story.nodeId) {
                  isNewStory = false;
                  return story;
                }
                return existingStory;
              })
              .filter(Boolean) as unknown as Array<Story | Reference>; // filter out nulls
            if (isNewStory && newStoryRef) {
              updatedStories.unshift(newStoryRef);
            }
            return updatedStories;
          },
        },
      });
    },
  });
};
