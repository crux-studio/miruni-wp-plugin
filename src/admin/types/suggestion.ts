import { StoryAiSuggestionsQueryResult } from '@miruni/graphql';

export const UpdateRequiredType = {
  POST_TITLE: 'post_title',
  OTHER_POST_TITLE: 'other_post_title',
  OTHER_POST_CONTENT: 'other_post_content',
  OTHER_POST_EXCERPT: 'other_post_excerpt',
  POST_CONTENT: 'post_content',
  THEME_JSON: 'theme',
  THEME_CSS: 'theme_css',
  THEME_HTML: 'theme_html',
  THEME_MOD: 'theme_mod',
  WP_OPTION: 'wp_option',
  ELEMENTOR_JSON: 'elementor_json',
  MENU_ITEM_NAME: 'menu_item_name',
  BLOCK_TEMPLATE: 'block_template',
} as const;

export type UpdateRequiredType = (typeof UpdateRequiredType)[keyof typeof UpdateRequiredType];

export interface Change {
  draftId: number; // ID of the draft which has been created to view the changes
  suggestionId: number;
  fileName: string;
  changesMade: string;
  confidenceScore: number;
  userScore: number;
  userComments: string;
  fileType?: UpdateRequiredType;
  fileIdentifier?: string;
  originalContent: string;
  newContent?: string;
  // This could be the draft itself or another post referenced in the draft
  post?: {
    postId: number;
    postTitle: string;
    postContent: string;
  };
}

export type Suggestion = NonNullable<
  NonNullable<
    NonNullable<StoryAiSuggestionsQueryResult['data']>['storyAiSuggestionBatches']
  >['nodes']
>[number]['storyAiSuggestionsBySuggestionBatchId']['nodes'][number];
