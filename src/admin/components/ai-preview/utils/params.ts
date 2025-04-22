import { Params } from '@miruni/models/src/constants/params';

export const addDeactivateSnippetParam = (url: string) => {
  try {
    const urlObject = new URL(url, window.location.origin);
    urlObject.searchParams.set(Params.NO_SNIPPET, 'true');
    return urlObject.toString();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error adding deactivate snippet param to URL', url);
    return url;
  }
};
