import { makeVar, useReactiveVar } from '@apollo/client';

const websocketStoryIdsVar = makeVar(new Set<number>());

export const useWebsocketStories = () => {
  const websocketStories = useReactiveVar(websocketStoryIdsVar);

  const addWebsocketStory = (storyId: number) => {
    websocketStoryIdsVar(websocketStories.add(storyId));
  };

  const removeWebsocketStory = (storyId: number) => {
    websocketStories.delete(storyId);
    websocketStoryIdsVar(new Set(websocketStories));
  };

  const isWebsocketStory = (storyId: number) => websocketStories.has(storyId);

  return {
    websocketStories,
    addWebsocketStory,
    removeWebsocketStory,
    isWebsocketStory,
  };
};
