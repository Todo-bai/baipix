import { createContext, useContext } from 'react';
import type { Actions } from './actions';

export const ActionsContext = createContext<Actions | null>(null);

export function useActions(): Actions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useActions must be used inside <ActionsContext.Provider>');
  return actions;
}
