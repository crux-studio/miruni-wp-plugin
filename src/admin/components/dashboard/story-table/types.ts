export type HandleFilter<V> = (value: V | V[]) => void;
export type HandleFilterByName<V> = (
  filterName: string,
  value: V | V[],
  options?: {
    dontSave?: boolean;
  },
) => void;
