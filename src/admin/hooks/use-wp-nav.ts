import { useNavigate } from 'react-router-dom';

type QueryParams = Record<string, string | string[]>;

export const ViewName = {
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
  AI_PREVIEW: 'ai-preview',
  THEME_FILES: 'theme-files',
  CREATE_PLAN: 'create-plan',
  PAYMENT_SUCCESS: 'payment-success',
  RENEW_PLAN: 'renew-plan',
} as const;

export type ViewName = (typeof ViewName)[keyof typeof ViewName];

export const useWordPressNavigation = () => {
  const navigate = useNavigate();

  const appendArrayParams = (params: URLSearchParams, key: string, value: string | string[]) => {
    if (Array.isArray(value)) {
      // Append each array value with the same key
      value.forEach((item) => params.append(key, item));
    } else {
      params.append(key, value);
    }
  };

  const goToView = (view: ViewName, additionalParams: QueryParams = {}) => {
    const params = new URLSearchParams();

    // Add required 'page' parameter
    params.append('page', 'miruni');
    if (view) params.append('view', view);

    // Handle additional parameters
    Object.entries(additionalParams).forEach(([key, value]) => {
      appendArrayParams(params, key, value);
    });

    navigate({
      pathname: window.miruniData.adminUrl.replace(window.location.origin, ''),
      search: params.toString(),
    });
  };

  const updateQueryParams = (newParams: QueryParams, options = { shallow: true }) => {
    const currentParams = new URLSearchParams(location.search);
    const updatedParams = new URLSearchParams();

    // Preserve existing params that aren't being updated
    for (const [key, value] of currentParams.entries()) {
      if (!(key in newParams)) {
        updatedParams.append(key, value);
      }
    }

    // Add new params
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        appendArrayParams(updatedParams, key, value);
      }
    });

    navigate(
      {
        pathname: window.miruniData.adminUrl.replace(window.location.origin, ''),
        search: updatedParams.toString(),
      },
      {
        replace: options.shallow,
      },
    );
  };

  const replaceQueryParams = (params: QueryParams) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      appendArrayParams(searchParams, key, value);
    });

    navigate(
      {
        pathname: window.miruniData.adminUrl.replace(window.location.origin, ''),
        search: searchParams.toString(),
      },
      {
        replace: true,
      },
    );
  };

  const getQueryParams = () => {
    const searchParams = new URLSearchParams(location.search);
    const params: QueryParams = {};

    // Group multiple values with the same key into arrays
    for (const [key, value] of searchParams.entries()) {
      if (key in params) {
        const existingValue = params[key];
        if (Array.isArray(existingValue)) {
          existingValue.push(value);
        } else {
          params[key] = [existingValue, value];
        }
      } else {
        params[key] = value;
      }
    }

    return params;
  };

  // removeQueryParams remains the same
  const removeQueryParams = (params: string[]) => {
    const currentParams = new URLSearchParams(location.search);
    const currentParamsObj = Object.fromEntries(currentParams.entries());

    params.forEach((key) => {
      delete currentParamsObj[key];
    });

    const searchParams = new URLSearchParams(currentParamsObj);

    navigate(
      {
        pathname: window.miruniData.adminUrl.replace(window.location.origin, ''),
        search: searchParams.toString(),
      },
      {
        replace: true,
      },
    );
  };

  return { goToView, updateQueryParams, getQueryParams, replaceQueryParams, removeQueryParams };
};
