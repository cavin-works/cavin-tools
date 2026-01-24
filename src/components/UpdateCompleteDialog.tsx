import { relaunch } from '@tauri-apps/plugin-process';
import { CheckCircle, X } from 'lucide-react';
import { useAppStore } from '@/core/store/appStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UpdateCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateCompleteDialog({ open, onOpenChange }: UpdateCompleteDialogProps) {
  const { clearUpdate } = useAppStore();

  const handleRelaunch = async () => {
    try {
      await relaunch();
    } catch (err) {
      console.error('重启失败:', err);
    }
  };

  const handleClose = () => {
    clearUpdate();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>更新完成</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            应用已成功更新到最新版本
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex justify-center">
          <div className="flex items-center gap-3 p-6 bg-green-500/10 text-green-600 rounded-full">
            <CheckCircle className="w-16 h-16" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            稍后手动重启
          </Button>
          <Button onClick={handleRelaunch}>
            立即重启
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
