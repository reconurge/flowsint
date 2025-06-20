import { type JSX, useMemo, useCallback } from "react";

export type IconType = string;

interface IconProps {
  className?: string;
  size?: number;
}

const getIconPath = (type: string): string => {
  try {
    return new URL(`/icons/${type}.svg`, window.location.origin).href;
  } catch {
    return '';
  }
};

export const useIcon = (type: IconType) => {
  // Memoize the icon path
  const iconPath = useMemo(() => getIconPath(type), [type]);

  // Memoize the component itself
  return useCallback(({ className, size = 24 }: IconProps): JSX.Element => {
    if (!iconPath) {
      return <div className={className} style={{ width: size, height: size }} />;
    }

    return (
      <img
        src={iconPath}
        className={className}
        width={size}
        height={size}
        alt={`${type} icon`}
      />
    );
  }, [iconPath]);
};

