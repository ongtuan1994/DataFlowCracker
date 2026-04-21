import { BaseEdge, EdgeProps, getBezierPath, Edge, EdgeLabelRenderer } from '@xyflow/react';

export type AnimatedEdgeData = {
  isAnimating?: boolean;
  particleColor?: string;
  animationSpeed?: number;
  label?: string;
};

export function AnimatedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<Edge<AnimatedEdgeData>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isAnimating = data?.isAnimating || false;
  const particleColor = data?.particleColor || '#3b82f6';
  const speed = data?.animationSpeed || 1.5;

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#e5e7eb',
          strokeDasharray: '5,5',
        }} 
      />
      
      {isAnimating && (
        <circle r="6" fill={particleColor}>
          <animateMotion 
            dur={`${speed}s`} 
            repeatCount="indefinite" 
            path={edgePath} 
          />
        </circle>
      )}

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: 11,
              fontWeight: 600,
              color: '#374151',
              border: '1px solid #d1d5db',
              pointerEvents: 'all',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              zIndex: 10,
            }}
            className="nodrag nopan"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
