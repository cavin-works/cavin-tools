import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────

interface JSONTreeViewProps {
  data: any;
}

interface JSONNodeProps {
  data: any;
  keyName?: string;
  parentPath: string;
  isLast: boolean;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function getValueClass(value: any): string {
  const base = 'font-mono';
  switch (getType(value)) {
    case 'string':
      return `${base} text-green-600 dark:text-green-400`;
    case 'number':
      return `${base} text-blue-600 dark:text-blue-400`;
    case 'boolean':
      return `${base} text-purple-600 dark:text-purple-400`;
    case 'null':
      return `${base} text-gray-500 dark:text-gray-400`;
    default:
      return base;
  }
}

function formatPrimitive(value: any): string {
  const type = getType(value);
  if (type === 'string') return `"${value}"`;
  if (type === 'null') return 'null';
  return String(value);
}

function buildPath(parentPath: string, key: string, isArrayItem: boolean): string {
  if (!parentPath) return isArrayItem ? `[${key}]` : key;
  return isArrayItem ? `${parentPath}[${key}]` : `${parentPath}.${key}`;
}

function copyValueText(value: any): string {
  const type = getType(value);
  if (type === 'object' || type === 'array') return JSON.stringify(value, null, 2);
  return String(value);
}

// ─── JSONNode (internal recursive component) ─────────────────────────────────

function JSONNode({ data, keyName, parentPath, isLast, copiedId, onCopy }: JSONNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isObjectOrArray = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const entries = isObjectOrArray ? Object.entries(data) : [];
  const isEmpty = entries.length === 0;

  const isParentArray = keyName !== undefined && /^\d+$/.test(keyName);
  const resolvedPath = keyName !== undefined
    ? buildPath(parentPath, keyName, isParentArray)
    : parentPath;

  const comma = isLast ? '' : ',';

  const pathCopyId = `${resolvedPath}:key`;
  const valueCopyId = `${resolvedPath}:value`;

  const handleCopyPath = () => onCopy(resolvedPath, pathCopyId);
  const handleCopyValue = () => onCopy(copyValueText(data), valueCopyId);

  // ── Primitive value ──
  if (!isObjectOrArray) {
    return (
      <div className="flex items-center leading-6 hover:bg-muted/40 rounded px-1 -mx-1 group">
        {keyName !== undefined && (
          <>
            <span className="text-amber-600 dark:text-amber-400 font-mono">"{keyName}"</span>
            <span className="text-muted-foreground mx-1">:</span>
          </>
        )}
        <span className={getValueClass(data)}>{formatPrimitive(data)}</span>
        <span className="text-muted-foreground">{comma}</span>
        <span className="flex gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {resolvedPath && (
            <Button
              onClick={handleCopyPath}
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              title={`复制路径: ${resolvedPath}`}
            >
              {copiedId === pathCopyId
                ? <Check className="w-3 h-3 text-green-500" />
                : <Copy className="w-3 h-3 text-muted-foreground" />}
            </Button>
          )}
          <Button
            onClick={handleCopyValue}
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            title="复制值"
          >
            {copiedId === valueCopyId
              ? <Check className="w-3 h-3 text-green-500" />
              : <Copy className="w-3 h-3 text-muted-foreground" />}
          </Button>
        </span>
      </div>
    );
  }

  // ── Object / Array ──
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  // Empty object/array: render inline
  if (isEmpty) {
    return (
      <div className="flex items-center leading-6 hover:bg-muted/40 rounded px-1 -mx-1 group">
        {keyName !== undefined && (
          <>
            <span className="text-amber-600 dark:text-amber-400 font-mono">"{keyName}"</span>
            <span className="text-muted-foreground mx-1">:</span>
          </>
        )}
        <span className="text-muted-foreground font-mono">{openBracket}{closeBracket}</span>
        <span className="text-muted-foreground">{comma}</span>
        <span className="flex gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {resolvedPath && (
            <Button
              onClick={handleCopyPath}
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              title={`复制路径: ${resolvedPath}`}
            >
              {copiedId === pathCopyId
                ? <Check className="w-3 h-3 text-green-500" />
                : <Copy className="w-3 h-3 text-muted-foreground" />}
            </Button>
          )}
          <Button
            onClick={handleCopyValue}
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            title="复制值"
          >
            {copiedId === valueCopyId
              ? <Check className="w-3 h-3 text-green-500" />
              : <Copy className="w-3 h-3 text-muted-foreground" />}
          </Button>
        </span>
      </div>
    );
  }

  return (
    <div className="select-text">
      {/* Header line: key : { / [ */}
      <div
        className="flex items-center leading-6 hover:bg-muted/40 rounded px-1 -mx-1 group cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="shrink-0 w-4 h-4 flex items-center justify-center mr-0.5">
          {isExpanded
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </span>
        {keyName !== undefined && (
          <>
            <span className="text-amber-600 dark:text-amber-400 font-mono">"{keyName}"</span>
            <span className="text-muted-foreground mx-1">:</span>
          </>
        )}
        {isExpanded ? (
          <span className="text-muted-foreground font-mono">{openBracket}</span>
        ) : (
          <>
            <span className="text-muted-foreground font-mono">{openBracket}</span>
            <span className="text-muted-foreground mx-1 text-xs">
              {entries.length} 项
            </span>
            <span className="text-muted-foreground font-mono">{closeBracket}</span>
            <span className="text-muted-foreground">{comma}</span>
          </>
        )}
        <span
          className="flex gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {resolvedPath && (
            <Button
              onClick={handleCopyPath}
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              title={`复制路径: ${resolvedPath}`}
            >
              {copiedId === pathCopyId
                ? <Check className="w-3 h-3 text-green-500" />
                : <Copy className="w-3 h-3 text-muted-foreground" />}
            </Button>
          )}
          <Button
            onClick={handleCopyValue}
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            title="复制值"
          >
            {copiedId === valueCopyId
              ? <Check className="w-3 h-3 text-green-500" />
              : <Copy className="w-3 h-3 text-muted-foreground" />}
          </Button>
        </span>
      </div>

      {/* Children */}
      {isExpanded && (
        <div className="pl-5">
          {entries.map(([k, v], i) => (
            <JSONNode
              key={`${k}-${i}`}
              data={v}
              keyName={k}
              parentPath={resolvedPath}
              isLast={i === entries.length - 1}
              copiedId={copiedId}
              onCopy={onCopy}
            />
          ))}
          {/* Closing bracket */}
          <div className="leading-6 text-muted-foreground font-mono px-1 -mx-1">
            {closeBracket}{comma}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── JSONTreeView (public component) ─────────────────────────────────────────

export function JSONTreeView({ data }: JSONTreeViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, []);

  return (
    <div className="font-mono text-sm select-text">
      <JSONNode
        data={data}
        parentPath=""
        isLast={true}
        copiedId={copiedId}
        onCopy={handleCopy}
      />
    </div>
  );
}
