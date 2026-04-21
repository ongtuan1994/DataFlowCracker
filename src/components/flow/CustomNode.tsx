import { Handle, Position } from '@xyflow/react';
import * as Icons from 'lucide-react';
import { cn } from '../../lib/utils';

export type SchemaField = { name: string; type: string; key?: 'PK' | 'FK' };

export type CustomNodeData = {
  label: string;
  color: string;
  colorName?: string;
  icon: string;
  subLabel?: string;
  variant?: 'default' | 'section' | 'tech-stack' | 'schema-table' | 'logic-block' | 'flowchart';
  fields?: SchemaField[];
  codeLines?: string[];
  shape?: 'start' | 'end' | 'process' | 'decision' | 'io' | 'subprocess';
  params?: string;
  returns?: string;
};

export function CustomNode({ data, selected }: { data: CustomNodeData; selected?: boolean }) {
  // @ts-ignore
  const IconComponent = Icons[data.icon] || Icons.Circle;
  const variant = data.variant || 'default';

  if (variant === 'section') {
    return (
      <div className="group w-full h-full">
        <Handle type="target" position={Position.Top} className="opacity-0" />
        <div
          className={cn(
            "w-full h-full rounded-[22px] border-2 bg-white/90 p-4 shadow-md transition-all",
            selected ? 'shadow-xl' : ''
          )}
          style={{ borderColor: data.color, boxShadow: `0 10px 30px ${data.color}18` }}
        >
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 border text-sm font-bold bg-white"
            style={{ borderColor: data.color, color: data.color }}
          >
            <IconComponent size={16} />
            <span>{data.label}</span>
          </div>
          {data.subLabel && (
            <div className="mt-2 text-[11px] text-gray-500 leading-snug">
              {data.subLabel}
            </div>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>
    );
  }

  if (variant === 'tech-stack') {
    return (
      <div className="group">
        <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        <div
          className={cn(
            "w-40 rounded-2xl border-2 bg-white px-3 py-3 shadow-md transition-all",
            selected ? 'scale-[1.03] shadow-lg' : ''
          )}
          style={{ borderColor: data.color }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${data.color}18` }}>
              <IconComponent size={18} style={{ color: data.color }} />
            </div>
            <span className="text-sm font-bold text-gray-800 leading-tight">{data.label}</span>
          </div>
          {data.subLabel && (
            <div className="text-[11px] text-gray-500 leading-snug whitespace-pre-line">
              {data.subLabel}
            </div>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  if (variant === 'schema-table') {
    return (
      <div className="group w-full">
        <Handle type="target" position={Position.Left} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        <div
          className={cn(
            "w-full rounded-xl border-2 bg-white shadow-md overflow-hidden transition-all",
            selected ? 'shadow-lg ring-2 ring-offset-1' : ''
          )}
          style={{ borderColor: data.color }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: `${data.color}15` }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${data.color}25` }}>
              <IconComponent size={13} style={{ color: data.color }} />
            </div>
            <span className="text-sm font-bold leading-tight" style={{ color: data.color }}>{data.label}</span>
          </div>
          {/* Fields */}
          {data.fields && data.fields.length > 0 && (
            <div className="divide-y divide-gray-100">
              {data.fields.map((field, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-[5px]">
                  <span className="text-[11px] font-mono text-gray-700 flex items-center gap-1">
                    {field.key === 'PK' && <span className="text-yellow-500 text-[10px]">🔑</span>}
                    {field.key === 'FK' && <span className="text-blue-400 text-[10px]">🔗</span>}
                    {!field.key && <span className="inline-block w-[14px]" />}
                    {field.name}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 ml-2 shrink-0">{field.type}</span>
                </div>
              ))}
            </div>
          )}
          {/* Operation hint */}
          {data.subLabel && (
            <div className="px-3 py-[5px] text-[10px] text-gray-400 border-t border-gray-100 bg-gray-50 font-mono">
              {data.subLabel}
            </div>
          )}
        </div>
        <Handle type="source" position={Position.Right} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  if (variant === 'logic-block') {
    return (
      <div className="group w-full">
        <Handle type="target" position={Position.Left} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        <div
          className={cn(
            "w-full rounded-xl border-2 overflow-hidden shadow-md transition-all",
            selected ? 'shadow-lg ring-2 ring-offset-1' : ''
          )}
          style={{ borderColor: data.color }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: `${data.color}15` }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${data.color}25` }}>
              <IconComponent size={13} style={{ color: data.color }} />
            </div>
            <span className="text-sm font-bold font-mono leading-tight" style={{ color: data.color }}>{data.label}</span>
          </div>
          {/* Code body */}
          {data.codeLines && data.codeLines.length > 0 && (
            <div className="bg-gray-950 px-3 py-2 space-y-[1px]">
              {data.codeLines.map((line, i) => {
                const trimmed = line.trimStart();
                const indent = line.length - trimmed.length;
                const colorClass =
                  trimmed.startsWith('//') ? 'text-gray-500' :
                  trimmed.startsWith('return') ? 'text-green-400' :
                  trimmed.startsWith('throw') ? 'text-red-400' :
                  /^(if|else|for|while|switch)\b/.test(trimmed) ? 'text-yellow-300' :
                  /^(fn |async fn |router\.|function )/.test(trimmed) ? 'text-sky-300' :
                  indent > 0 ? 'text-blue-200' :
                  'text-gray-100';
                return (
                  <div key={i} className={`text-[11px] font-mono leading-[18px] whitespace-pre ${colorClass}`}>
                    {line}
                  </div>
                );
              })}
            </div>
          )}
          {/* Role hint */}
          {data.subLabel && (
            <div className="px-3 py-[5px] text-[10px] text-gray-400 border-t border-gray-800 bg-gray-900 font-mono">
              {data.subLabel}
            </div>
          )}
        </div>
        <Handle type="source" position={Position.Right} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  if (variant === 'flowchart') {
    const shape = data.shape || 'process';

    if (shape === 'start' || shape === 'end') {
      return (
        <div className="group">
          <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          <div
            className={cn('flex items-center gap-2 rounded-full border-2 px-4 py-2 shadow-md transition-all', selected ? 'shadow-lg scale-105' : '')}
            style={{ backgroundColor: data.color, borderColor: data.color }}
          >
            <IconComponent size={14} color="white" />
            <span className="text-sm font-bold text-white leading-tight">{data.label}</span>
          </div>
          <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      );
    }

    if (shape === 'decision') {
      return (
        <div className="group w-full">
          <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          <div
            className={cn('rounded-xl border-2 overflow-hidden shadow-md transition-all', selected ? 'shadow-lg' : '')}
            style={{ borderColor: data.color }}
          >
            <div className="flex items-center gap-2 px-3 py-[7px]" style={{ backgroundColor: `${data.color}1a` }}>
              <span className="text-base font-black leading-none" style={{ color: data.color }}>◇</span>
              <span className="text-sm font-bold font-mono" style={{ color: data.color }}>{data.label}?</span>
            </div>
            {data.params && (
              <div className="px-3 py-[5px] text-[11px] font-mono text-gray-600 border-t border-gray-100 bg-white">
                if&nbsp;({data.params})
              </div>
            )}
            <div className="px-3 py-[5px] flex gap-4 text-[11px] font-mono bg-white">
              <span className="text-emerald-600 font-semibold">✓ true → continue</span>
              <span className="text-red-500 font-semibold">✗ false → reject</span>
            </div>
          </div>
          <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      );
    }

    return (
      <div className="group w-full">
        <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        <div
          className={cn(
            'rounded-xl border-2 overflow-hidden shadow-md bg-white transition-all',
            shape === 'subprocess' ? 'ring-2 ring-offset-1' : '',
            selected ? 'shadow-lg' : '',
          )}
          style={{ borderColor: data.color }}
        >
          <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: `${data.color}14` }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${data.color}28` }}>
              <IconComponent size={13} style={{ color: data.color }} />
            </div>
            <span className="text-[13px] font-bold font-mono leading-tight truncate" style={{ color: data.color }}>
              {shape === 'io' ? data.label : `${data.label}()`}
            </span>
          </div>
          {data.params && (
            <div className="px-3 pt-[5px] pb-0 text-[11px] font-mono text-gray-500 border-t border-gray-100">
              <span className="text-gray-400">in:&nbsp;</span>{data.params}
            </div>
          )}
          {data.returns && (
            <div className="px-3 pb-[5px] pt-0 text-[11px] font-mono text-gray-500">
              <span className="text-gray-400">→&nbsp;</span>{data.returns}
            </div>
          )}
          {data.subLabel && !data.params && !data.returns && (
            <div className="px-3 py-[5px] text-[11px] text-gray-400 border-t border-gray-100">
              {data.subLabel}
            </div>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center group">
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity" />

      <div
        className={cn(
          "w-20 h-20 rounded-full border-4 flex items-center justify-center bg-white shadow-md transition-all",
          selected ? "scale-110 shadow-lg" : ""
        )}
        style={{ borderColor: data.color }}
      >
        <IconComponent size={32} style={{ color: data.color }} />
      </div>

      <div className="mt-3 flex flex-col items-center">
        <span
          className="px-3 py-1 text-xs font-bold rounded-full border bg-white shadow-sm text-center"
          style={{ borderColor: data.color, color: data.color }}
        >
          {data.label}
        </span>
        {data.subLabel && (
          <span className="text-[10px] text-gray-500 mt-1 text-center max-w-[120px] leading-tight">
            {data.subLabel}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
