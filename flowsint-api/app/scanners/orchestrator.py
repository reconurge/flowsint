from typing import List, Dict, Any, Tuple, Set
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ValidationError
from app.scanners.base import Scanner
from app.scanners.registry import ScannerRegistry
from app.types.transform import FlowBranch, FlowStep
from app.core.logger import Logger

class TransformOrchestrator(Scanner):
    def __init__(self, sketch_id: str, scan_id: str, transform_branches: List[FlowBranch],logger: Logger, neo4j_conn=None ):
        super().__init__(sketch_id, scan_id, neo4j_conn=neo4j_conn, logger=logger)
        self.transform_branches = transform_branches
        self.scanners = {}  # Map of nodeId -> scanner instance
        self._load_scanners()

    def _load_scanners(self) -> None:
        if not self.transform_branches:
            raise ValueError("No transform branches provided")

        # Collect all scanner nodes across all branches
        scanner_nodes = []
        for branch in self.transform_branches:
            for step in branch.steps:
                if step.type == "type":
                    continue
                scanner_nodes.append(step)
        
        if not scanner_nodes:
            raise ValueError("No scanner nodes found in transform branches")
        
        # Create scanner instances for each node
        for node in scanner_nodes:
            node_id = node.nodeId
            
            # Extract scanner name from nodeId (assuming format like "scanner_name-1234567890")
            scanner_name = node_id.split('-')[0]
            
            if not ScannerRegistry.scanner_exists(scanner_name):
                raise ValueError(f"Scanner '{scanner_name}' not found in registry")

            scanner = ScannerRegistry.get_scanner(scanner_name, self.sketch_id, self.scan_id, neo4j_conn=self.neo4j_conn, logger=self.logger)
            self.scanners[node_id] = scanner
            
        # Log the execution plan for debugging
        self.log_execution_plan()

    def log_execution_plan(self):
        """Log the execution plan for debugging purposes"""
        self.logger.info(self.scan_id, self.sketch_id, "Workflow execution plan:")
        
        for branch_idx, branch in enumerate(self.transform_branches):
            branch_id = branch.id
            branch_name = branch.name
            
            self.logger.info(self.scan_id, self.sketch_id, f"Branch: {branch_name} (ID: {branch_id})")
            
            steps = branch.steps
            for step_idx, step in enumerate(steps):
                node_id = step.nodeId
                scanner_name = node_id.split('-')[0]
                depth = step.depth
                
                # Log the step information
                inputs_str = ', '.join([f"{k}: {v}" for k, v in step.inputs.items()])
                outputs_str = ', '.join([f"{k}: {v}" for k, v in step.outputs.items()])
                
                self.logger.info(self.scan_id, self.sketch_id, 
                    f"  Step {step_idx+1}: {scanner_name} (Depth: {depth})")
                self.logger.info(self.scan_id, self.sketch_id, f"    Inputs: {inputs_str}")
                self.logger.info(self.scan_id, self.sketch_id, f"    Outputs: {outputs_str}")

    def resolve_reference(self, ref_value: str, results_mapping: Dict[str, Any]) -> Any:
        """
        Resolve a reference value from the results mapping.
        References could be just the key name like "transformed_domain".
        """
        if ref_value in results_mapping:
            return results_mapping[ref_value]
        return None

    def prepare_scanner_inputs(self, step: FlowStep, results_mapping: Dict[str, Any], initial_values: List[str]) -> List[Any]:
        """
        Prépare les inputs d'un scanner à partir des références et des résultats précédents.
        Gère les références simples, les listes, et les valeurs directes.
        """
        inputs = {}
        
        for input_key, input_ref in step.inputs.items():
            # Cas 1 : une seule référence (string)
            if isinstance(input_ref, str):
                resolved = self.resolve_reference(input_ref, results_mapping)
                if resolved is not None:
                    inputs[input_key] = resolved

            # Cas 2 : liste de références ou valeurs
            elif isinstance(input_ref, list):
                resolved_items = []
                for item in input_ref:
                    if isinstance(item, str) and item in results_mapping:
                        resolved_items.append(results_mapping[item])
                    else:
                        resolved_items.append(item)  # valeur directe
                inputs[input_key] = resolved_items

            else:
                # Cas inattendu (valeur directe ?)
                inputs[input_key] = input_ref

        # Si aucun input n'a été résolu, utiliser les valeurs initiales
        if not inputs:
            scanner = self.scanners.get(step.nodeId)
            if scanner:
                primary_key = scanner.key()
                return {primary_key: initial_values}
        
        return inputs[input_key]


    def update_results_mapping(self, outputs: Dict[str, Any], step_outputs: Dict[str, str], results_mapping: Dict[str, Any]) -> None:
        """
        Update the results mapping with new outputs from a scanner.
        """
        for output_key, output_ref in step_outputs.items():
            if output_key in outputs:
                results_mapping[output_ref] = outputs[output_key]

    @classmethod
    def name(cls) -> str:
        return "transform_orchestrator"

    @classmethod
    def category(cls) -> str:
        return "composite"

    @classmethod
    def key(cls) -> str:
        return "values"

    @classmethod
    def input_schema(cls) -> Dict[str, str]:
        return {"values": "array<string>"}

    @classmethod
    def output_schema(cls) -> Dict[str, str]:
        return {
            "branches": "array",
            "results": "dict"
        }

    def scan(self, values: List[str]) -> Dict[str, Any]:
        results = {
            "initial_values": values,
            "branches": [],
            "results": {}
        }
        
        # Global mapping of output references to actual values
        results_mapping = {}
        
        # Process each branch
        for branch in self.transform_branches:
            branch_id = branch.id
            branch_name = branch.name
            branch_results = {
                "id": branch_id,
                "name": branch_name,
                "steps": []
            }
            
            # Process each step in the branch
            scanner_inputs = values
            for step in branch.steps:
                if step.type == "type":
                    continue
                node_id = step.nodeId
                scanner = self.scanners.get(node_id)
                
                if not scanner:
                    self.logger.error(self.scan_id, self.sketch_id, f"Scanner not found for node {node_id}")
                    continue
                
                scanner_name = scanner.name()
                step_result = {
                    "nodeId": node_id,
                    "scanner": scanner_name,
                    "status": "error"  # Default to error, will update on success
                }
                
                try:
                    # Prepare inputs for this scanner
                    # scanner_inputs = self.prepare_scanner_inputs(step, results_mapping, values)
                    # self.logger.debug(self.scan_id, self.sketch_id,f"Current values to be used: {str(scanner_inputs)}")
                    if not scanner_inputs:
                        self.logger.warn(self.scan_id, self.sketch_id,
                                    f"No inputs available for scanner {scanner_name}, skipping")
                        step_result["error"] = "No inputs available"
                        branch_results["steps"].append(step_result)
                        continue
                    
                    # self.logger.info(self.scan_id, self.sketch_id, 
                    #         f"Running scanner {scanner_name} with inputs: {str(scanner_inputs)}")
                    
                    # Execute the scanner
                    outputs = scanner.execute(scanner_inputs)
                    if not isinstance(outputs, (dict, list)):
                        raise ValueError(f"Scanner '{scanner_name}' returned unsupported output format")
                    self.logger.success(self.scan_id, self.sketch_id, f"Found {str(len(outputs))} for scanner {scanner.name()}")
                    # Convert outputs to JSON-serializable format
                    # outputs = self.results_to_json(outputs)
                    
                    # Store the outputs in the step result
                    step_result["outputs"] = outputs
                    step_result["status"] = "completed"
                    
                    # Update the global results mapping with the outputs
                    self.update_results_mapping(outputs, step.outputs, results_mapping)
                    
                    # Also store the raw outputs in the main results
                    results["results"][node_id] = outputs
                    scanner_inputs = outputs

                except ValidationError as e:
                    error_msg = f"Validation error: {str(e)}"
                    self.logger.error(self.scan_id, self.sketch_id, f"Validation error in {scanner_name}: {str(e)}")
                    step_result["error"] = error_msg
                    results["results"][node_id] = {"error": error_msg}
                    
                except Exception as e:
                    error_msg = f"Error during scan: {str(e)}"
                    self.logger.error(self.scan_id, self.sketch_id, f"Error during scan {scanner_name}: {str(e)}")
                    step_result["error"] = error_msg
                    results["results"][node_id] = {"error": error_msg}
                
                branch_results["steps"].append(step_result)
            
            results["branches"].append(branch_results)
        
        # Include the final reference mapping for debugging
        results["reference_mapping"] = results_mapping
        
        return results
    
    def results_to_json(self, results: Any) -> Any:
        if isinstance(results, UUID):
            return str(results)
        if isinstance(results, datetime):
            return results.isoformat()
        if isinstance(results, BaseModel):
            return results.dict()
        if isinstance(results, list):
            return [self.results_to_json(item) for item in results]
        if isinstance(results, dict):
            return {key: self.results_to_json(value) for key, value in results.items()}
        return results