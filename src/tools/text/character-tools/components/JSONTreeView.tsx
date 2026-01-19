import { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JSONNodeProps {
  data: any;
  keyName?: string;
  level?: number;
}

export function JSONTreeView({ data, keyName, level = 0 }: JSONNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedValue, setCopiedValue] = useState(false);

  const getType = (value: any): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };

  const formatValue = (value: any): string => {
    const type = getType(value);
    if (type === 'string') return `"${value}"`;
    if (type === 'null') return 'null';
    if (type === 'object' || type === 'array') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getValueClass = (value: any): string => {
    const type = getType(value);
    const baseClasses = 'font-mono';
    
    switch (type) {
      case 'string':
        return `${baseClasses} text-green-600 dark:text-green-400`;
      case 'number':
        return `${baseClasses} text-blue-600 dark:text-blue-400`;
      case 'boolean':
        return `${baseClasses} text-purple-600 dark:text-purple-400`;
      case 'null':
        return `${baseClasses} text-gray-500 dark:text-gray-400`;
      default:
        return baseClasses;
    }
  };

  const handleCopyValue = async (value: any) => {
    try {
      await navigator.clipboard.writeText(formatValue(value));
      setCopiedValue(true);
      setTimeout(() => setCopiedValue(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const isObjectOrArray = data !== null && typeof data === 'object';
  const isEmpty = isObjectOrArray && Object.keys(data).length === 0;
  const isArray = Array.isArray(data);

  if (isObjectOrArray) {
    return (
      <div className="select-text" style={{ marginLeft: `${level * 16}px` }}>
        {keyName && (
          <div className="flex items-center gap-1 group">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hover:bg-muted/50 rounded p-0.5 transition-colors"
              disabled={isEmpty}
            >
              {isEmpty ? (
                <span className="w-4 h-4 inline-block" />
              ) : isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <span className="text-amber-600 dark:text-amber-400 font-mono">"{keyName}"</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-gray-600 dark:text-gray-400">
              {isArray ? '[' : '{'}
            </span>
            {!isExpanded && !isEmpty && (
              <span className="text-muted-foreground ml-2">
                ... {Object.keys(data).length} 项
              </span>
            )}
            {isEmpty && (
              <span className="text-gray-600 dark:text-gray-400">
                {isArray ? ']' : '}'}
              </span>
            )}
            {keyName && (
              <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isEmpty && (
                  <Button
                    onClick={() => handleCopyValue(data)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="复制 Value"
                  >
                    {copiedValue ? (
                      <Check className="w-3 h-3 text-foreground" />
                    ) : (
                      <Copy className="w-3 h-3 text-foreground" />
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        {isExpanded && !isEmpty && (
          <div className="ml-4">
            {Object.entries(data).map(([k, v], index, arr) => (
              <div key={`${k}-${index}`}>
                <JSONTreeView
                  data={v}
                  keyName={k}
                  level={0}
                />
                {index < arr.length - 1 && (
                  <span className="text-muted-foreground">,</span>
                )}
              </div>
            ))}
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                {isArray ? ']' : '}'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1 hover:bg-muted/30 py-0.5 px-1 -mx-1 rounded transition-colors group">
      {keyName && (
        <>
          <span className="text-amber-600 dark:text-amber-400 font-mono">"{keyName}"</span>
          <span className="text-muted-foreground">:</span>
        </>
      )}
      <span className={getValueClass(data)}>
        {formatValue(data)}
      </span>
      {keyName && (
        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={() => handleCopyValue(data)}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="复制 Value"
          >
            {copiedValue ? (
              <Check className="w-3 h-3 text-foreground" />
            ) : (
              <Copy className="w-3 h-3 text-foreground" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
