import { type JSX, useMemo, useCallback } from "react";
import { useNodesDisplaySettings } from "@/stores/node-display-settings";

export type IconType = string;

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
  showBorder?: boolean;
  color?: string;
  type?: string;
}

const getIconPath = (type: string): string => {
  return new URL(`/icons/${type}.svg`, window.location.origin).href;
};

const getDefaultIconPath = (): string => {
  return new URL(`/icons/default.svg`, window.location.origin).href;
};

export const useIcon = (type: IconType) => {
  // Memoize the icon path
  const iconPath = useMemo(() => getIconPath(type), [type]);

  // Memoize the component itself
  return useCallback(({
    className,
    size = 24,
    style,
    showBorder = false,
    color,
    type: iconType
  }: IconProps): JSX.Element => {
    const colors = useNodesDisplaySettings((s) => s.colors);
    const col = color || colors[iconType as keyof typeof colors] || "#000000";
    const containerSize = size + 16; // Make container slightly larger than icon

    if (showBorder) {
      return (
        <div
          style={{
            border: `${size / 8}px solid ${col}`,
            width: `${containerSize}px`,
            height: `${containerSize}px`,
            ...style,
          }}
          className={`flex bg-card items-center justify-center rounded-full ${className || ""}`}
        >
          <img
            src={iconPath}
            width={size}
            height={size}
            alt={`${type} icon`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getDefaultIconPath();
            }}
          />
        </div>
      );
    }

    return (
      <img
        src={iconPath}
        className={className}
        width={size}
        height={size}
        style={style}
        alt={`${type} icon`}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = getDefaultIconPath();
        }}
      />
    );
  }, [iconPath]);
};

