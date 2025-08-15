import type { Edge, Node } from "@xyflow/react";
import type { NodeData, EdgeData } from "./graph";
import type { Profile } from "./profile";

// ================================
// SCANNER TYPE DEFINITIONS
// ================================

export interface ScannerProperty {
    name: string
    type: string
}

export interface ScannerIO {
    type: string
    properties: ScannerProperty[]
}

export interface ScannerParamSchemaItem {
    name: string
    type: string
    description: string
    default: string
    required: boolean
}

export interface Scanner {
    id: string
    class_name: string
    category: string
    name: string
    module: string
    documentation: string | null
    description: string | null
    inputs: ScannerIO
    outputs: ScannerIO
    type: string
    required_params: boolean
    params: Record<string, string>
    params_schema: ScannerParamSchemaItem[]
    settings?: Record<string, string>
    icon: string | null
}

// ================================
// NODE DATA TYPE FOR TRANSFORM STORE
// ================================

export interface ScannerNodeData extends Scanner, Record<string, unknown> {
    color?: string
    computationState?: "pending" | "processing" | "completed" | "error"
    key: string
}

// ================================
// DATA STRUCTURES
// ================================

export interface ScansData {
    [category: string]: Scanner[]
}

export interface ScannerData {
    items: ScansData
}

// ================================
// COMPONENT PROPS INTERFACES
// ================================

export interface ScannerItemProps {
    scanner: Scanner
    category: string
}

export interface ScannerNodeProps {
    data: ScannerNodeData
    isConnectable?: boolean
    selected?: boolean
}

// ================================
// TRANSFORM TYPE DEFINITIONS
// ================================

export interface Transform {
    id: string;
    class_name: string;
    name: string;
    module: string;
    description: string;
    documentation: string;
    category: string;
}

// ================================
// TRANSFORM DATA STRUCTURES
// ================================

export interface TransformsData {
    [category: string]: Transform[];
}

export interface TransformData {
    items: TransformsData;
}

// ================================
// COMPONENT PROPS INTERFACES
// ================================

export interface TransformItemProps {
    transform: Transform;
    category: string;
}