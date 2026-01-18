import { useVideoStore } from '../../store/videoStore';
import { Progress } from '@/components/ui/progress';

export function ProgressBar() {
  const { isProcessing, progress, currentOperation } = useVideoStore();

  if (!isProcessing) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            {currentOperation || '处理中...'}
          </span>
          <span className="text-sm text-muted-foreground">
            {progress.toFixed(0)}%
          </span>
        </div>

        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
}
