import { Minus, Plus } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export const Scale = ({ scale }: { scale: number }) => {
  return (
    <div className="w-fit py-2 px-4 fixed bottom-10 left-10">
      <div className="flex bg-[#232329] px-4 py-2 rounded-md gap-3">
        <p className="text-white">{Math.round(scale * 100)}%</p>
      </div>

      <div className="flex items-center border rounded-md overflow-hidden mt-2">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {}}
                className="h-8 w-8 rounded-none"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent />
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="px-3 py-1 border-l border-r min-w-[70px] text-center">
                {Math.round(scale * 100)}%
              </div>
            </TooltipTrigger>
            <TooltipContent />
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {}}
                className="h-8 w-8 rounded-none"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent />
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
