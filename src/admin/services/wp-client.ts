import { TemplateQueryArgs } from '#/admin/types/query-args';
import { Suggestion, UpdateRequiredType } from '#/admin/types/suggestion';

export enum OnboardingStatus {
  COMPLETE = 'COMPLETE',
}
export interface PreviewDraftResponse {
  preview_url: string;
}
export interface WordPressPage {
  id: number;
  title: string;
  slug: string;
  url: string;
}

export interface PreviewResponse {
  preview_url: string;
  preview_page_id: number;
  preview_title: string;
  changes: Array<{
    file_name: string;
    changes_made: string;
    original_content: string;
    file_identifier?: string;
    file_type: UpdateRequiredType;
    suggestion_id: number;
    post?: {
      post_id: number;
      post_title: string;
      post_content: string;
    };
  }>;
}

export interface DraftContent {
  post_id: number;
  content: string;
  title: string;
  parent_id: number;
  parent_content: string;
}

export class WPClient {
  private static makeWPRequest = async <T>(action: string, data: object): Promise<T> => {
    const formData = new FormData();
    formData.append('action', action);
    formData.append('nonce', window.miruniData.nonce);

    // Append other data
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await fetch(window.miruniData.ajaxUrl, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.data);
    }
  };

  public static saveApiKeyInWordpress = async (
    apiKey: string,
    secretKey: string,
  ): Promise<void> => {
    await WPClient.makeWPRequest('update_miruni_api_key', {
      api_key: apiKey,
      secret_key: secretKey,
    });
  };

  public static getOnboardingStatus = async (): Promise<OnboardingStatus | null> => {
    try {
      const status = await WPClient.makeWPRequest<string>('get_onboarding_status', {});
      return status as OnboardingStatus;
    } catch (error) {
      return null;
    }
  };

  public static setOnboardingStatus = async (status: OnboardingStatus): Promise<void> => {
    await WPClient.makeWPRequest('set_onboarding_status', { status });
  };

  public static createPreviewDraft = async (postId: number, content: string): Promise<string> => {
    const response = await WPClient.makeWPRequest<PreviewDraftResponse>('create_preview_draft', {
      post_id: postId,
      content,
    });
    return response.preview_url;
  };

  public static requestEditPreview2 = async (
    pageId: number,
    suggestionBatchId: number,
    updates: Suggestion[],
  ): Promise<PreviewResponse> => {
    const response = await WPClient.makeWPRequest<PreviewResponse>('request_edit_preview_v2', {
      page_id: pageId,
      suggestion_batch_id: suggestionBatchId,
      updates: JSON.stringify(updates),
    });
    return response;
  };

  public static getPublishedPages = async (): Promise<WordPressPage[]> => {
    return WPClient.makeWPRequest<WordPressPage[]>('get_published_pages', {});
  };

  public static backupTemplates = async (): Promise<void> => {
    await WPClient.makeWPRequest('backup_templates', {});
  };

  public static getTemplates = async (pageId: number): Promise<void> => {
    await WPClient.makeWPRequest('get_templates', {
      page_id: pageId,
    });
  };

  public static createPreviewTheme = async (): Promise<void> => {
    await WPClient.makeWPRequest('create_preview', {});
  };

  public static revertPreviewChanges = async (): Promise<void> => {
    await WPClient.makeWPRequest('revert_changes', {});
  };

  public static updateDraftContent = async (postId: number, content: string): Promise<void> => {
    await WPClient.makeWPRequest('update_draft_content', {
      post_id: postId,
      content,
    });
  };

  public static updateDraftTitle = async (postId: number, title: string): Promise<void> => {
    await WPClient.makeWPRequest('update_draft_title', {
      post_id: postId,
      title,
    });
  };

  public static getDraftContent = async (postId: number): Promise<DraftContent> => {
    return WPClient.makeWPRequest<DraftContent>('get_draft_content', {
      post_id: postId,
    });
  };

  public static publishDraft = async (postId: number): Promise<void> => {
    await WPClient.makeWPRequest('publish_draft', {
      post_id: postId,
    });
  };

  public static revertPublishDraft = async (postId: number): Promise<void> => {
    await WPClient.makeWPRequest('revert_publish_draft', {
      post_id: postId,
    });
  };

  public static getTemplateFiles = async (): Promise<string[]> => {
    return WPClient.makeWPRequest('get_template_files', {});
  };

  public static getTemplateFileContents = async (fileName: string): Promise<string> => {
    return WPClient.makeWPRequest('get_template_file_contents', { file_name: fileName });
  };

  public static saveTemplatePostQueryArguments = async (
    fileName: string,
    postQueryArguments: string | null,
  ): Promise<void> => {
    await WPClient.makeWPRequest('save_template_post_query_arguments', {
      file_name: fileName,
      args: postQueryArguments,
    });
  };

  public static getTemplatePostQueryArguments = async (): Promise<Record<
    string,
    TemplateQueryArgs
  > | null> => {
    return WPClient.makeWPRequest('get_all_template_search_args', {});
  };

  public static userUpdateToChange = async (
    draftId: number,
    suggestion: Suggestion,
  ): Promise<void> => {
    await WPClient.makeWPRequest('user_update_to_change', {
      draft_id: draftId,
      change: JSON.stringify(suggestion),
    });
  };

  /**
   * Stores changes to other posts or theme mods that are part of a draft
   *
   * @param draftId - ID of the draft post
   * @param changeType - Type of change (post_title, post_content, theme_mod)
   * @param content - New content value
   * @param options - Additional options based on change type
   * @returns Promise with operation result
   */
  public static storeOtherPostChange = async (
    draftId: number,
    changeType: 'post_title' | 'post_content' | 'theme_mod',
    content: string,
    options: {
      postId?: number;
      modName?: string;
    },
  ): Promise<{
    draft_id: number;
    change_type: string;
    message: string;
  }> => {
    const data: Record<string, string | number> = {
      draft_id: draftId,
      change_type: changeType,
      content,
    };

    // Add additional parameters based on change type
    if (changeType === 'post_title' || changeType === 'post_content') {
      if (!options.postId) {
        throw new Error(`Post ID is required for ${changeType} changes`);
      }
      data.post_id = options.postId;
    } else if (changeType === 'theme_mod') {
      if (!options.modName) {
        throw new Error('Mod name is required for theme_mod changes');
      }
      data.mod_name = options.modName;
    }

    return WPClient.makeWPRequest<{
      draft_id: number;
      change_type: string;
      message: string;
    }>('store_other_post_change', data);
  };
}
