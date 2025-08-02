import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useArchitectStore } from '@/stores/useArchitectStore';
import { GenericServiceNode } from './nodes/GenericServiceNode';
import { DatabaseNode } from './nodes/DatabaseNode';
import { MessageQueueNode } from './nodes/MessageQueueNode';
import { LoadBalancerNode } from './nodes/LoadBalancerNode';
import { CacheNode } from './nodes/CacheNode';
import { APIGatewayNode } from './nodes/APIGatewayNode';
import { EnhancedArchitectEdge } from './edges/EnhancedArchitectEdge';

const nodeTypes = {
  'generic-service': GenericServiceNode,
  'database': DatabaseNode,
  'message-queue': MessageQueueNode,
  'load-balancer': LoadBalancerNode,
  'cache': CacheNode,
  'api-gateway': APIGatewayNode,
};

const edgeTypes = {
  'architech': EnhancedArchitectEdge,
};

export const ArchitectCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onConnect,
    selectNode,
    selectEdge,
  } = useArchitectStore();

  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState(nodes);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Sync store with React Flow
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
    setNodes(reactFlowNodes);
  }, [onNodesChange, setNodes, reactFlowNodes]);

  const handleEdgesChange = useCallback((changes: any[]) => {
    onEdgesChange(changes);
    setEdges(reactFlowEdges);
  }, [onEdgesChange, setEdges, reactFlowEdges]);

  const handleConnect = useCallback((params: Connection) => {
    setReactFlowEdges((eds) => addEdge({ ...params, type: 'architech' }, eds));
    onConnect(params);
  }, [onConnect, setReactFlowEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectNode(node.id);
  }, [selectNode]);

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    selectEdge(edge.id);
  }, [selectEdge]);

  const handlePaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.current?.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      if (!position) return;

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: `New ${type.replace('-', ' ')}`,
          properties: getDefaultPropertiesForType(type),
        },
      };

      setReactFlowNodes((nds) => nds.concat(newNode));
      setNodes([...reactFlowNodes, newNode]);
    },
    [reactFlowNodes, setNodes, setReactFlowNodes]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  return (
    <div className="flex-1 h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onInit={onInit}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        style={{ backgroundColor: 'hsl(var(--canvas-background))' }}
        className="architech-flow"
      >
        <Controls 
          className="!bg-card !border-border !shadow-panel"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        <MiniMap 
          className="!bg-card !border-border !shadow-panel"
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--muted) / 0.2)"
        />
        <Background 
          gap={20}
          size={1}
          color="hsl(var(--canvas-grid))"
        />
      </ReactFlow>
    </div>
  );
};

function getDefaultPropertiesForType(type: string) {
  switch (type) {
    case 'generic-service':
      return [
        { id: 'name', name: 'Service Name', type: 'string', value: 'New Service' },
        { id: 'description', name: 'Description', type: 'textarea', value: '' },
        { id: 'instanceCount', name: 'Instance Count', type: 'number', value: 1, min: 1, max: 100 },
        { id: 'cpu', name: 'CPU (cores)', type: 'number', value: 1, min: 0.1, max: 16, step: 0.1 },
        { id: 'memory', name: 'Memory (MB)', type: 'number', value: 512, min: 128, max: 16384 },
        { id: 'requestPerSecond', name: 'Requests/sec', type: 'number', value: 100, min: 1, max: 10000 },
        { id: 'latency', name: 'Latency (ms)', type: 'number', value: 100, min: 1, max: 5000 },
        { id: 'errorRate', name: 'Error Rate (%)', type: 'number', value: 0, min: 0, max: 100 },
      ];
    case 'database':
      return [
        { id: 'name', name: 'Database Name', type: 'string', value: 'New Database' },
        { id: 'description', name: 'Description', type: 'textarea', value: '' },
        { id: 'type', name: 'Database Type', type: 'select', value: 'PostgreSQL', options: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Cassandra'] },
        { id: 'readLatency', name: 'Read Latency (ms)', type: 'number', value: 50, min: 1, max: 1000 },
        { id: 'writeLatency', name: 'Write Latency (ms)', type: 'number', value: 100, min: 1, max: 1000 },
        { id: 'maxConnections', name: 'Max Connections', type: 'number', value: 100, min: 1, max: 1000 },
        { id: 'storageCapacity', name: 'Storage (GB)', type: 'number', value: 100, min: 1, max: 10000 },
      ];
    case 'message-queue':
      return [
        { id: 'name', name: 'Queue Name', type: 'string', value: 'New Queue' },
        { id: 'description', name: 'Description', type: 'textarea', value: '' },
        { id: 'type', name: 'Queue Type', type: 'select', value: 'Kafka', options: ['Kafka', 'RabbitMQ', 'SQS', 'Redis'] },
        { id: 'throughput', name: 'Throughput (msg/s)', type: 'number', value: 1000, min: 1, max: 100000 },
        { id: 'latency', name: 'Latency (ms)', type: 'number', value: 10, min: 1, max: 1000 },
        { id: 'retentionPeriod', name: 'Retention (hours)', type: 'number', value: 24, min: 1, max: 8760 },
      ];
    case 'load-balancer':
      return [
        { id: 'name', name: 'Load Balancer Name', type: 'string', value: 'New Load Balancer' },
        { id: 'description', name: 'Description', type: 'textarea', value: '' },
        { id: 'algorithm', name: 'Algorithm', type: 'select', value: 'RoundRobin', options: ['RoundRobin', 'LeastConnections', 'IPHash', 'Weighted'] },
        { id: 'healthCheckInterval', name: 'Health Check (s)', type: 'number', value: 30, min: 1, max: 300 },
        { id: 'maxConnections', name: 'Max Connections', type: 'number', value: 1000, min: 1, max: 100000 },
      ];
    case 'cache':
      return [
        { id: 'name', name: 'Cache Name', type: 'string', value: 'New Cache' },
        { id: 'description', name: 'Description', type: 'textarea', value: '' },
        { id: 'type', name: 'Cache Type', type: 'select', value: 'Redis', options: ['Redis', 'Memcached', 'In-Memory'] },
        { id: 'capacity', name: 'Capacity (MB)', type: 'number', value: 1024, min: 1, max: 102400 },
        { id: 'hitRate', name: 'Hit Rate (%)', type: 'number', value: 90, min: 0, max: 100 },
        { id: 'evictionPolicy', name: 'Eviction Policy', type: 'select', value: 'LRU', options: ['LRU', 'LFU', 'FIFO', 'Random'] },
      ];
    case 'api-gateway':
      return [
        { id: 'name', name: 'Gateway Name', type: 'string', value: 'New API Gateway' },
        { id: 'description', name: 'Description', type: 'textarea', value: '' },
        { id: 'requestPerSecondLimit', name: 'Rate Limit (req/s)', type: 'number', value: 1000, min: 1, max: 100000 },
        { id: 'authentication', name: 'Authentication', type: 'select', value: 'OAuth2', options: ['OAuth2', 'JWT', 'APIKey', 'None'] },
        { id: 'rateLimiting', name: 'Rate Limiting', type: 'boolean', value: true },
      ];
    default:
      return [
        { id: 'name', name: 'Name', type: 'string', value: 'New Component' },
        { id: 'description', name: 'Description', type: 'textarea', value: '' },
      ];
  }
}