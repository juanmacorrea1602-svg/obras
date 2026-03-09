import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import {LucideIcon, Info} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  status?: 'good' | 'caution' | 'alert';
  icon?: LucideIcon;
  helpText?: string;
}

export function KPICard({title, value, description, status = 'good', icon: Icon, helpText}: KPICardProps) {
  const statusColors = {
    good: 'text-accent border-accent/20 bg-accent/5',
    caution: 'text-orange-500 border-orange-200 bg-orange-50',
    alert: 'text-destructive border-destructive/20 bg-destructive/5',
  };

  const badgeColors = {
    good: 'bg-accent',
    caution: 'bg-orange-500',
    alert: 'bg-destructive',
  };

  const cardContent = (
    <Card className={cn("overflow-hidden transition-all hover:shadow-md cursor-help")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
          {helpText && <Info className="h-3 w-3 text-muted-foreground/50" />}
        </div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold tracking-tighter">{value}</div>
          <div className={cn("w-2 h-2 rounded-full", badgeColors[status])} />
        </div>
        {description && (
          <p className={cn("text-xs font-medium mt-1", statusColors[status].split(' ')[0])}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (!helpText) return cardContent;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px] text-xs p-3">
          <p className="font-bold mb-1">{title}</p>
          <p className="text-muted-foreground leading-relaxed">{helpText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
