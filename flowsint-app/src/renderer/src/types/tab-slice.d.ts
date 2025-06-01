export interface TabsSlice {
    tabs: {
      /**
       * Array of active tabs.
       */
      items: TabInfo[];
  
      /**
       * Focused tab id.
       */
      selectedTabId: string;
  
      /**
       * The index of the selected tab in the items array.
       */
      selectedTabIndex: number;
  
      /**
       * Initializes the tabs. Must call this before using other methods in here.
       */
      initialize: () => Promise<void>;
  
      /**
       * Sets the selected tab.
       */
      setSelectedTab: (tab: TabInfo) => void;
  
      /**
       * Removes a tab
       */
      remove: (tab: TabInfo) => void;
  
      /**
       * Creates a new tab.
       */
      add: () => void;
  
      /**
       * Reorder tabs in the order of the given TabInfo array.
       */
      reorder: (tabs: TabInfo[]) => void;
    };
  }
  