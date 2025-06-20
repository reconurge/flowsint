import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useBoundStore } from '@/stores/use-bound-store';
import type { TabInfo } from '@/types/tabs';

interface UseTabManagementProps {
  id?: string;
  type?: string;
  investigationId?: string;
  data?: any;
  onError?: (error: Error) => void;
}

export function useTabManagement({
  id,
  type,
  investigationId,
  data,
  onError
}: UseTabManagementProps) {
  const navigate = useNavigate();
  const add = useBoundStore((state) => state.tabs.add);
  const tabs = useBoundStore((state) => state.tabs.items);
  const setSelectedTab = useBoundStore((state) => state.tabs.setSelectedTab);
  const selectedTabId = useBoundStore((state) => state.tabs.selectedTabId);

  // Memoize tab existence check with all dependencies
  const tabExists = useMemo(() => {
    if (!id || !type || !investigationId) return false;
    return tabs.some(
      (t: TabInfo) =>
        t.id === id && t.type === type && t.investigationId === investigationId
    );
  }, [tabs, id, type, investigationId]);

  const activateTab = useMemo(() => {
    return (tabId: string) => {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab) return;

      setSelectedTab(tab);
      navigate({
        to: "/dashboard/investigations/$investigationId/$type/$id",
        params: {
          investigationId: tab.investigationId,
          type: tab.type,
          id: tab.id,
        },
      });
    };
  }, [setSelectedTab, tabs, navigate]);

  const createAndActivateTab = useMemo(() => {
    return async () => {
      if (!id || !type || !investigationId || !data) return false;
      try {
        await add({
          id,
          type: type as "graph" | "wall",
          investigationId,
          data,
          title: data.title || `${type} ${id}`,
        });
        
        activateTab(id);
        return true;
      } catch (error) {
        onError?.(error as Error);
        return false;
      }
    };
  }, [id, type, investigationId, data, add, activateTab, onError]);

  return {
    tabExists,
    isValid: Boolean(id && type && investigationId && data),
    currentTab: tabExists
      ? tabs.find(
          (t: TabInfo) =>
            t.id === id && t.type === type && t.investigationId === investigationId
        )
      : undefined,
    isActive: id === selectedTabId,
    activateTab,
    createAndActivateTab,
  };
} 