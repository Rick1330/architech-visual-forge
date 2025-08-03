/**
 * Design Data Serialization/Deserialization
 * Handles conversion between canvas state and backend design_data format
 */

import { Node, Edge } from '@xyflow/react';
import { logger } from '@/lib/logger';
import { errorHandler, ErrorType } from '@/lib/errorHandler';

export interface SerializedDesign {
  version: string;
  nodes: Node[];
  edges: Edge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  metadata: {
    created_at: string;
    updated_at: string;
    canvas_size?: {
      width: number;
      height: number;
    };
  };
}

export interface ComponentSchema {
  id: string;
  type: string;
  properties_schema: any; // JSON Schema
  default_properties: Record<string, any>;
}

/**
 * Serialize canvas state to design_data format
 */
export const serializeDesign = (
  nodes: Node[],
  edges: Edge[],
  viewport = { x: 0, y: 0, zoom: 1 }
): SerializedDesign => {
  try {
    const serialized: SerializedDesign = {
      version: '1.0.0',
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type || 'default',
        position: node.position,
        data: {
          name: node.data?.name || node.data?.label || `${node.type}_${node.id}`,
          // Convert properties array to object for backend
          properties: Array.isArray(node.data?.properties) 
            ? node.data.properties.reduce((acc: Record<string, any>, prop: any) => {
                acc[prop.id || prop.name] = prop.value;
                return acc;
              }, {})
            : node.data?.properties || {},
          description: node.data?.description || '',
          status: node.data?.status || 'idle',
          // Preserve any other node data
          ...Object.fromEntries(
            Object.entries(node.data || {}).filter(([key]) => 
              !['name', 'properties', 'description', 'status', 'label'].includes(key)
            )
          ),
        },
        // Include visual properties for reconstruction
        style: node.style,
        className: node.className,
        hidden: node.hidden || false,
        selected: false, // Reset selection state
        dragging: false, // Reset interaction state
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type || 'default',
        data: {
          name: edge.data?.name || `${edge.source}-to-${edge.target}`,
          protocol: edge.data?.protocol || 'HTTP',
          latency: edge.data?.latency || 0,
          bandwidth: edge.data?.bandwidth || 1000,
          errorRate: edge.data?.errorRate || 0,
          description: edge.data?.description || '',
          // Preserve other edge data
          ...Object.fromEntries(
            Object.entries(edge.data || {}).filter(([key]) => 
              !['name', 'protocol', 'latency', 'bandwidth', 'errorRate', 'description'].includes(key)
            )
          ),
        },
        style: edge.style,
        className: edge.className,
        animated: edge.animated || false,
        hidden: edge.hidden || false,
        markerStart: edge.markerStart,
        markerEnd: edge.markerEnd,
        selected: false, // Reset selection state
      })),
      viewport,
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        canvas_size: {
          width: Math.max(...nodes.map(n => n.position.x + 200), 1000),
          height: Math.max(...nodes.map(n => n.position.y + 200), 600),
        },
      },
    };

    logger.info('Design serialized successfully', {
      componentName: 'designSerializer',
      action: 'serialize_design',
      payload: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        version: serialized.version
      }
    });

    return serialized;
  } catch (error) {
    const appError = errorHandler.createError(
      ErrorType.VALIDATION,
      'Failed to serialize design data',
      {
        componentName: 'designSerializer',
        details: { nodeCount: nodes.length, edgeCount: edges.length }
      }
    );
    
    throw errorHandler.handleError(appError, 'designSerializer');
  }
};

/**
 * Deserialize design_data to canvas state
 */
export const deserializeDesign = (designData: any): {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
} => {
  try {
    // Handle legacy format or missing data
    if (!designData) {
      return {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      };
    }

    // If it's already in the new format
    if (designData.version) {
      const serialized = designData as SerializedDesign;
      
      logger.info('Design deserialized successfully', {
        componentName: 'designSerializer',
        action: 'deserialize_design',
        payload: {
          nodeCount: serialized.nodes.length,
          edgeCount: serialized.edges.length,
          version: serialized.version
        }
      });

      return {
        nodes: serialized.nodes || [],
        edges: serialized.edges || [],
        viewport: serialized.viewport || { x: 0, y: 0, zoom: 1 }
      };
    }

    // Handle legacy format
    const nodes = Array.isArray(designData.nodes) ? designData.nodes : [];
    const edges = Array.isArray(designData.edges) ? designData.edges : [];
    const viewport = designData.viewport || { x: 0, y: 0, zoom: 1 };

    logger.warn('Legacy design format detected, migrating', {
      componentName: 'designSerializer',
      action: 'deserialize_legacy_design',
      payload: {
        nodeCount: nodes.length,
        edgeCount: edges.length
      }
    });

    return { nodes, edges, viewport };
  } catch (error) {
    logger.error('Failed to deserialize design data', {
      componentName: 'designSerializer',
      errorDetails: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    // Return empty state if deserialization fails
    return {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 }
    };
  }
};

/**
 * Generate component property form schema
 */
export const generatePropertyForm = (componentSchema: ComponentSchema): {
  fields: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    defaultValue: any;
    options?: any[];
    validation?: any;
  }>;
} => {
  try {
    const fields: any[] = [];
    const schema = componentSchema.properties_schema;
    const defaults = componentSchema.default_properties;

    if (schema && schema.properties) {
      Object.entries(schema.properties).forEach(([key, property]: [string, any]) => {
        fields.push({
          name: key,
          type: property.type || 'string',
          label: property.title || key,
          required: schema.required?.includes(key) || false,
          defaultValue: defaults[key] || property.default,
          options: property.enum || undefined,
          validation: {
            min: property.minimum,
            max: property.maximum,
            pattern: property.pattern,
          }
        });
      });
    }

    logger.debug('Property form schema generated', {
      componentName: 'designSerializer',
      action: 'generate_property_form',
      payload: {
        componentType: componentSchema.type,
        fieldCount: fields.length
      }
    });

    return { fields };
  } catch (error) {
    logger.error('Failed to generate property form schema', {
      componentName: 'designSerializer',
      errorDetails: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      payload: { componentId: componentSchema.id }
    });

    return { fields: [] };
  }
};

/**
 * Validate design data
 */
export const validateDesignData = (designData: any): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  try {
    if (!designData) {
      errors.push('Design data is required');
      return { isValid: false, errors };
    }

    // Validate nodes
    if (designData.nodes && !Array.isArray(designData.nodes)) {
      errors.push('Nodes must be an array');
    } else if (designData.nodes) {
      designData.nodes.forEach((node: any, index: number) => {
        if (!node.id) {
          errors.push(`Node at index ${index} missing required 'id' field`);
        }
        if (!node.position) {
          errors.push(`Node at index ${index} missing required 'position' field`);
        }
      });
    }

    // Validate edges
    if (designData.edges && !Array.isArray(designData.edges)) {
      errors.push('Edges must be an array');
    } else if (designData.edges) {
      designData.edges.forEach((edge: any, index: number) => {
        if (!edge.id) {
          errors.push(`Edge at index ${index} missing required 'id' field`);
        }
        if (!edge.source) {
          errors.push(`Edge at index ${index} missing required 'source' field`);
        }
        if (!edge.target) {
          errors.push(`Edge at index ${index} missing required 'target' field`);
        }
      });
    }

    const isValid = errors.length === 0;

    logger.debug('Design data validation completed', {
      componentName: 'designSerializer',
      action: 'validate_design_data',
      payload: {
        isValid,
        errorCount: errors.length,
        nodeCount: designData.nodes?.length || 0,
        edgeCount: designData.edges?.length || 0
      }
    });

    return { isValid, errors };
  } catch (error) {
    errors.push('Validation failed due to unexpected error');
    return { isValid: false, errors };
  }
};

/**
 * Helper function to convert properties object to array format for UI
 */
export const convertPropertiesToArray = (properties: Record<string, any>, nodeType: string): any[] => {
  const defaultProps = getDefaultPropertiesForType(nodeType);
  
  return defaultProps.map(defaultProp => ({
    ...defaultProp,
    value: properties[defaultProp.id] !== undefined ? properties[defaultProp.id] : defaultProp.value
  }));
};

/**
 * Get default properties for component type
 */
export const getDefaultPropertiesForType = (type: string): any[] => {
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
};