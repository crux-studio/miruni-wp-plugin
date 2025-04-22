import { useState } from 'react';

import { DraftContent, WPClient } from '#/admin/services/wp-client';

export const useWpDraft = (pageId?: number) => {
  const [draft, setDraft] = useState<DraftContent | null>(null);

  const updateDraft = async () => {
    if (!pageId) return;
    const draft = await WPClient.getDraftContent(pageId);
    setDraft(draft);
  };

  // useEffect(() => {
  //   if (!pageId) return;
  //   void updateDraft();
  // }, [pageId]);

  const publishDraft = async () => {
    if (!pageId) return;
    await WPClient.publishDraft(pageId);
  };

  return {
    draft,
    updateDraft,
    publishDraft,
  };
};
