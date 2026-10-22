declare module 'pulltorefreshjs' {
  export interface PullToRefreshOptions {
    distThreshold?: number;
    distMax?: number;
    distReload?: number;
    distIgnore?: number;
    mainElement?: string | HTMLElement;
    triggerElement?: string | HTMLElement;
    ptrElement?: string | HTMLElement;
    classPrefix?: string;
    cssProp?: string;
    iconArrow?: string;
    iconRefreshing?: string;
    instructionsPullToRefresh?: string;
    instructionsReleaseToRefresh?: string;
    instructionsRefreshing?: string;
    refreshTimeout?: number;
    getMarkup?: () => string;
    getStyles?: () => string;
    onInit?: (handler: unknown) => void;
    onRefresh?: (done?: () => void) => void | Promise<unknown>;
    resistanceFunction?: (t: number) => number;
    shouldPullToRefresh?: () => boolean;
  }

  export interface PullToRefreshInstance {
    destroy: () => void;
  }

  const PullToRefresh: {
    init(options?: PullToRefreshOptions): PullToRefreshInstance;
    destroyAll(): void;
    setPassiveMode(isPassive: boolean): void;
    setPointerEventsMode(isEnabled: boolean): void;
  };

  export default PullToRefresh;
}
