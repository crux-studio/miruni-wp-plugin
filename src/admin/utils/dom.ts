import { MIRUNI_ADMIN_ROOT_ID } from '#/admin/constants/ids';

export const getMiruniElementById = (id: string): HTMLElement | null => {
  const root = document.getElementById(MIRUNI_ADMIN_ROOT_ID);
  const shadowRoot = root?.shadowRoot;
  const element = shadowRoot?.getElementById(id);
  return element ?? null;
};
