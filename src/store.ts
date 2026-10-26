import { useCallback, useRef, useState } from 'preact/hooks';
import type { IAppData } from './domain/model';
import { reduce, type TAction } from './domain/reducer';
import { loadResult, save } from './domain/storage';

export interface IFridgeStore {
  data: IAppData;
  dispatch: (action: TAction) => void;
  saveFailed: boolean;
}

export const useFridge = (): IFridgeStore => {
  const [loaded] = useState(loadResult);
  const [data, setData] = useState<IAppData>(loaded.data);
  const [saveFailed, setSaveFailed] = useState(loaded.saveFailed);
  const latest = useRef(loaded.data);

  const dispatch = useCallback((action: TAction) => {
    const next = reduce(latest.current, action);
    latest.current = next;
    setData(next);
    setSaveFailed(!save(next));
  }, []);

  return { data, dispatch, saveFailed };
};
