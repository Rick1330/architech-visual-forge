import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NodeProps {
  data: {
    label: string;
    properties: Array<{
      id: string;
      name: string;
      value: any;
    }>;
  };
  selected?: boolean;
}

export const GenericServiceNode = memo(({ data, selected }: NodeProps) => {
  const nameProperty = data.properties?.find(p => p.id === 'name');
  const instanceCountProperty = data.properties?.find(p => p.id === 'instanceCount');
  const name = nameProperty?.value || data.label || 'Service';
  const instanceCount = instanceCountProperty?.value || 1;

  return (
    <div className={`
      relative bg-card border-2 rounded-lg shadow-node transition-all duration-200
      ${selected ? 'border-canvas-selection shadow-glow-active' : 'border-border hover:border-node-service/50'}
      min-w-[140px] max-w-[200px]
    `}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-node-service border-2 border-card"
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-md bg-node-service/20">
            <Server className="h-4 w-4 text-node-service" />
          </div>
          <span className="font-medium text-sm truncate flex-1">{name}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            Service
          </Badge>
          {instanceCount > 1 && (
            <Badge variant="outline" className="text-xs">
              {instanceCount}x
            </Badge>
          )}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-node-service border-2 border-card"
      />
    </div>
  );
});