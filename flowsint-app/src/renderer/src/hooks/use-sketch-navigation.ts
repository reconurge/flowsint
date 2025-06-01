import { useQuery } from "@tanstack/react-query";
import { sketchService } from "@/api/sketch-service";
import { useNavigateToTab } from "./use-navigate-to-tab";

interface UseSketchNavigationProps {
  sketchId: string;
  investigationId: string;
}

export function useSketchNavigation({ sketchId, investigationId }: UseSketchNavigationProps) {
  // Fetch sketch data
  const { data: sketchData } = useQuery({
    queryKey: ["investigations", investigationId, "graph", sketchId],
    queryFn: () => sketchService.getById(sketchId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    enabled: !!sketchId && !!investigationId,
  });

  const { navigateToTab } = useNavigateToTab();

  const navigateToSketch = () => {
    return navigateToTab({
      id: sketchId,
      type: "graph",
      investigationId,
      data: sketchData,
      title: sketchData?.title,
    });
  };

  return {
    navigateToSketch,
    isReady: Boolean(sketchData),
  };
} 