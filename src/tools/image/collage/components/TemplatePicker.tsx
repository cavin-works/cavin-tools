import { useImageCollageStore } from '../store/collageStore';
import { TEMPLATES } from '../types';
import type { CollageTemplate } from '../types';

/** 3 个小方块的纯 CSS 模板示意（不嵌 img） */
function TemplateGlyph({ template }: { template: CollageTemplate }) {
  const box = 'bg-current opacity-70 rounded-[1px]';
  if (template === 'row') {
    return (
      <div className="flex flex-row gap-[2px] w-5 h-3.5">
        <div className={`${box} flex-1`} />
        <div className={`${box} flex-1`} />
        <div className={`${box} flex-1`} />
      </div>
    );
  }
  if (template === 'column') {
    return (
      <div className="flex flex-col gap-[2px] w-3.5 h-5">
        <div className={`${box} flex-1`} />
        <div className={`${box} flex-1`} />
        <div className={`${box} flex-1`} />
      </div>
    );
  }
  const cols = template === 'grid-2' ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div className={`grid ${cols} gap-[2px] w-4.5 h-4.5`}>
      {Array.from({ length: template === 'grid-2' ? 4 : 9 }, (_, i) => (
        <div key={i} className={`${box} w-full h-full`} />
      ))}
    </div>
  );
}

export function TemplatePicker() {
  const template = useImageCollageStore((s) => s.params.template);
  const updateParams = useImageCollageStore((s) => s.updateParams);

  return (
    <div className="grid grid-cols-4 gap-2">
      {TEMPLATES.map((option) => (
        <button
          key={option.id}
          type="button"
          title={option.label}
          onClick={() => updateParams({ template: option.id })}
          className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-md border transition-colors ${
            template === option.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <TemplateGlyph template={option.id} />
          <span className="text-xs">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
