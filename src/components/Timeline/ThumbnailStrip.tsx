import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Loader2 } from 'lucide-react';

interface ThumbnailStripProps {
  videoPath: string;
  duration: number;
  width: number;
  height?: number;
  className?: string;
}

export function ThumbnailStrip({
  videoPath,
  duration,
  width,
  height = 80,
  className = ''
}: ThumbnailStripProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 根据宽度计算需要的缩略图数量，确保覆盖整个视频
  // 减少缩略图数量以提升性能：每个缩略图约 150-200px 宽
  const thumbnailCount = Math.max(10, Math.min(30, Math.ceil(width / 150)));
  const thumbnailWidth = width / thumbnailCount;

  console.log('ThumbnailStrip 渲染:', { videoPath, duration, width, thumbnailCount, loading, loadedCount: thumbnails.length });

  useEffect(() => {
    let mounted = true;

    const loadThumbnails = async () => {
      setLoading(true);
      setError(null);
      setThumbnails([]); // 清空之前的缩略图

      try {
        console.log('开始批量并行加载缩略图...', { videoPath, duration, width, thumbnailCount });

        // 批量并行生成：每次生成 5 张，减少调用次数
        const batchSize = 5;
        const batches = Math.ceil(thumbnailCount / batchSize);

        for (let batch = 0; batch < batches; batch++) {
          if (!mounted) break;

          const startIndex = batch * batchSize;
          const count = Math.min(batchSize, thumbnailCount - startIndex);

          console.log(`正在生成第 ${batch + 1}/${batches} 批缩略图 (${startIndex + 1}-${startIndex + count})...`);

          try {
            // 批量生成缩略图
            const thumbs = await invoke<string[]>('generate_thumbnails', {
              inputPath: videoPath,
              count,
              startIndex,
              totalCount: thumbnailCount,
            });

            if (thumbs && thumbs.length > 0) {
              console.log(`第 ${batch + 1} 批缩略图生成成功，共 ${thumbs.length} 张`);
              // 增量添加到列表
              setThumbnails(prev => [...prev, ...thumbs]);
            }
          } catch (err) {
            console.error(`第 ${batch + 1} 批缩略图生成失败:`, err);
            // 继续生成下一批，不要中断
          }
        }

        console.log('所有缩略图加载完成');
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('缩略图加载失败:', err);
        if (mounted) {
          setError(err as string);
          setLoading(false);
        }
      }
    };

    loadThumbnails();

    return () => {
      mounted = false;
    };
  }, [videoPath, thumbnailCount]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-red-50 ${className}`} style={{ width, height }}>
        <span className="text-xs text-red-600 mb-1">缩略图加载失败</span>
        <span className="text-xs text-red-400 text-center px-2" title={error}>
          {error.length > 30 ? error.substring(0, 30) + '...' : error}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${className}`} style={{ width, height }}>
      {/* 只有在没有缩略图时才显示 loading */}
      {loading && thumbnails.length === 0 && (
        <div className="flex items-center justify-center w-full h-full bg-gray-200">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* 显示已生成的缩略图（即使还在加载中） */}
      {thumbnails.length > 0 && (
        <>
          {thumbnails.map((src, index) => (
            <div
              key={index}
              className="h-full flex-shrink-0"
              style={{ width: thumbnailWidth }}
            >
              <img
                src={src}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover block"
                style={{ imageRendering: 'auto' }}
                loading="lazy"
                onLoad={() => console.log(`缩略图 ${index + 1} 加载成功`)}
                onError={(e) => console.error(`缩略图 ${index + 1} 加载失败`, e)}
              />
            </div>
          ))}
        </>
      )}

      {/* 显示加载进度（在末尾占位） */}
      {loading && thumbnails.length > 0 && thumbnails.length < thumbnailCount && (
        <div
          className="flex items-center justify-center bg-gray-100 flex-shrink-0"
          style={{
            width: thumbnailWidth * (thumbnailCount - thumbnails.length)
          }}
        >
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}
    </div>
  );
}
