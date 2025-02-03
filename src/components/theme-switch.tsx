"use client";

import { FC } from "react";
import { useTheme } from "next-themes";
import { useIsSSR } from "@react-aria/ssr";
import clsx from "clsx";

import { SunIcon, MoonIcon } from "lucide-react";
import { Switch } from "@radix-ui/themes";


export const ThemeSwitch = ({

}) => {
  const { theme, setTheme } = useTheme();
  const isSRR = useIsSSR()

  const onChange = () => {
    theme === "light" ? setTheme("dark") : setTheme("light");
  };

  return (
    <div>
      {!isSRR && <Switch defaultChecked suppressHydrationWarning onCheckedChange={onChange} checked={theme === "light"} />}
    </div>
  );
};
