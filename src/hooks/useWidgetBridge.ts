import { useEffect, useCallback } from 'react';
import { listen, emit } from '@tauri-apps/api/event';

export interface WidgetBridge {
  openWidget: () => void;
  sendInflectionResult: (results: unknown[]) => void;
  sendSearchResult: (result: unknown) => void;
  sendLexiconData: (data: {
    entries: unknown[];
    inflectionProfile: unknown;
    metadata: unknown;
  }) => void;
}

export interface UseWidgetBridgeOptions {
  onAddWord: (word: string) => void;
  onAddInflection: (payload: {
    word: string;
    originalMeaning: string;
    formName: string;
  }) => void;
  onSearch: (term: string) => any;
  onInflectRequest: (entry: any) => any[];
  openWidget: () => void;
}

export function useWidgetBridge(options: UseWidgetBridgeOptions): WidgetBridge {
  const { onAddWord, onAddInflection, onSearch, onInflectRequest, openWidget } = options;

  useEffect(() => {
    let unlistenAddWord: (() => void) | undefined;
    let unlistenAddInflection: (() => void) | undefined;
    let unlistenSearch: (() => void) | undefined;
    let unlistenInflect: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenAddWord = await listen('widget:request-add-word', (event: { payload: string }) => {
        onAddWord(event.payload);
      });

      unlistenAddInflection = await listen(
        'widget:request-add-inflection',
        (event: { payload: { word: string; originalMeaning: string; formName: string } }) => {
          onAddInflection(event.payload);
        }
      );

      unlistenSearch = await listen('widget:search', async (event: { payload: string }) => {
        const result = await onSearch(event.payload);
        sendSearchResult(result);
      });

      unlistenInflect = await listen('main:inflect-request', async (event: { payload: unknown }) => {
        const results = await onInflectRequest(event.payload);
        sendInflectionResult(results);
      });
    };

    setupListeners();

    return () => {
      unlistenAddWord?.();
      unlistenAddInflection?.();
      unlistenSearch?.();
      unlistenInflect?.();
    };
  }, [onAddWord, onAddInflection, onSearch, onInflectRequest]);

  const sendInflectionResult = useCallback((results: unknown[]) => {
    emit('main:inflect-result', results);
  }, []);

  const sendSearchResult = useCallback((result: unknown) => {
    emit('widget:search-result', result);
  }, []);

  const sendLexiconData = useCallback(
    (data: {
      entries: unknown[];
      inflectionProfile: unknown;
      metadata: unknown;
    }) => {
      emit('widget:lexicon-data', data);
    },
    []
  );

  return {
    openWidget,
    sendInflectionResult,
    sendSearchResult,
    sendLexiconData,
  };
}
