/**
 * Pure types for the graph layer.
 * No runtime dependencies — these are structural contracts only.
 */

export interface FieldDefinition {
  name: string;
  type: string;
  required?: boolean;
}

export interface RecordTypeNode {
  key: string;
  name: string;
  projectId: string;
  baseType?: string | null;
  fields: FieldDefinition[];
}

export interface WorkflowNode {
  key: string;
  name: string;
  projectId: string;
  triggerType?: string;
  steps: { stepType: string; orderIndex: number }[];
}

export interface FormNode {
  key: string;
  recordTypeKey: string;
  layout: unknown;
}

export interface GraphNode {
  type: "record_type" | "workflow" | "form";
  key: string;
  projectId: string;
  data: RecordTypeNode | WorkflowNode | FormNode;
}

export interface EdgeDefinition {
  from: string; // node key
  to: string; // node key
  type: "inherits" | "triggers" | "binds_to";
}

export interface Binding {
  sourceKey: string;
  targetKey: string;
  bindingType: string;
}

export interface GraphPackage {
  key: string;
  name: string;
  version: string;
  description?: string;
  recordTypes: RecordTypeNode[];
  workflows: WorkflowNode[];
  forms?: FormNode[];
  bindings?: Binding[];
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: EdgeDefinition[];
  packages: { key: string; version: string }[];
}

export interface GraphValidationError {
  code: string;
  message: string;
  nodeKey?: string;
}

export interface GraphDiff {
  added: GraphNode[];
  removed: GraphNode[];
  modified: { key: string; before: GraphNode; after: GraphNode }[];
}
