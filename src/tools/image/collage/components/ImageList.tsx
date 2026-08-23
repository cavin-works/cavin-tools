import { convertFileSrc } from '@tauri-apps/api/core';
import { GripVertical, Plus, X } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useImageCollageStore } from '../store/collageStore';
import { Button } from '@/components/ui/button';

const MAX_IMAGES = 9;

function SortableImageItem({
  index,
  onRemove,
}: {
  index: number;
  onRemove: (id: string) => void;
}) {
  const image = useImageCollageStore((s) => s.images[index]);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 p-2 rounded-md border border-border bg-background"
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <img
        src={convertFileSrc(image.path)}
        alt={image.filename}
        draggable={false}
        className="w-10 h-10 object-cover rounded shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate" title={image.filename}>
          {image.filename}
        </p>
        <p className="text-xs text-muted-foreground">
          {image.width} × {image.height}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{index + 1}</span>
      <button
        type="button"
        title="移除"
        onClick={() => onRemove(image.id)}
        className="text-muted-foreground hover:text-destructive shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ImageList({ onAdd }: { onAdd: () => void }) {
  const images = useImageCollageStore((s) => s.images);
  const removeImage = useImageCollageStore((s) => s.removeImage);
  const moveImage = useImageCollageStore((s) => s.moveImage);

  // 需要移动 8px 才开始拖拽，避免误触
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = images.findIndex((img) => img.id === active.id);
    const to = images.findIndex((img) => img.id === over.id);
    if (from !== -1 && to !== -1) {
      moveImage(from, to);
    }
  };

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((img) => img.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {images.map((image, index) => (
                <SortableImageItem key={image.id} index={index} onRemove={removeImage} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onAdd}>
          <Plus className="w-4 h-4" />
          添加图片
        </Button>
        {images.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => useImageCollageStore.getState().clearImages()}>
            清空
          </Button>
        )}
        <span className="text-xs text-muted-foreground shrink-0">
          {images.length}/{MAX_IMAGES}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">拖动图片可调整拼贴顺序</p>
    </div>
  );
}
