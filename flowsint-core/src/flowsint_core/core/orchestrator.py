from typing import List, Dict, Any
from datetime import datetime
import time
from pydantic import ValidationError
from .transform_base import Transform
from .registry import TransformRegistry
from .types import FlowBranch, FlowStep
from .logger import Logger
from ..utils import to_json_serializable
import asyncio
import json
import os


class FlowOrchestrator(Transform):
    """
    Orchestrator for running a list of transforms.
    """

    def __init__(
        self,
        sketch_id: str,
        scan_id: str,
        transform_branches: List[FlowBranch],
        neo4j_conn=None,
        vault=None,
    ):
        super().__init__(sketch_id, scan_id, neo4j_conn=neo4j_conn, vault=vault)
        self.transform_branches = transform_branches
        self.transforms = {}  # Map of nodeId -> transform instance
        self.execution_log_file = None  # Path to the execution log file
        self._create_execution_log()
        self._load_transforms()

    def _create_execution_log(self) -> None:
        """
        Create the initial execution log JSON file with transform configuration.
        """
        try:
            # Create a directory for storing transform files if it doesn't exist
            transform_dir = "transform_logs"
            os.makedirs(transform_dir, exist_ok=True)

            # Create filename with sketch_id and scan_id
            filename = f"transform_execution_{self.sketch_id}_{self.scan_id}.json"
            self.execution_log_file = os.path.join(transform_dir, filename)

            # Serialize the transform branches
            serialized_branches = to_json_serializable(self.transform_branches)

            # Create initial log structure
            initial_log = {
                "sketch_id": self.sketch_id,
                "scan_id": self.scan_id,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "status": "initialized",
                "transform_branches": serialized_branches,
                "execution_log": [],
                "summary": {
                    "total_steps": 0,
                    "completed_steps": 0,
                    "failed_steps": 0,
                    "total_execution_time_ms": 0,
                },
                "final_results": {},
            }

            # Count total steps
            total_steps = 0
            for branch in self.transform_branches:
                for step in branch.steps:
                    if step.type != "type":
                        total_steps += 1
            initial_log["summary"]["total_steps"] = total_steps

            # Save initial log file
            with open(self.execution_log_file, "w", encoding="utf-8") as f:
                json.dump(initial_log, f, indent=2, ensure_ascii=False)

            Logger.info(
                self.sketch_id,
                {
                    "message": f"Transform execution log created at {self.execution_log_file}"
                },
            )

        except Exception as e:
            Logger.error(
                self.sketch_id, {"message": f"Failed to create execution log: {str(e)}"}
            )
            self.execution_log_file = None

    def _update_execution_log(
        self, step_entry: Dict[str, Any], status: str = None
    ) -> None:
        """
        Update the execution log file with a new step entry or status update.
        """
        if not self.execution_log_file:
            return

        try:
            # Read current log
            with open(self.execution_log_file, "r", encoding="utf-8") as f:
                log_data = json.load(f)

            # Update timestamp
            log_data["updated_at"] = datetime.now().isoformat()

            # Update status if provided
            if status:
                log_data["status"] = status

            # Add step entry if provided
            if step_entry:
                log_data["execution_log"].append(step_entry)

                # Update summary
                if step_entry["status"] == "completed":
                    log_data["summary"]["completed_steps"] += 1
                elif step_entry["status"] == "error":
                    log_data["summary"]["failed_steps"] += 1

                if "execution_time_ms" in step_entry:
                    log_data["summary"]["total_execution_time_ms"] += step_entry[
                        "execution_time_ms"
                    ]

            # Write updated log
            with open(self.execution_log_file, "w", encoding="utf-8") as f:
                json.dump(log_data, f, indent=2, ensure_ascii=False)

        except Exception as e:
            Logger.error(
                self.sketch_id, {"message": f"Failed to update execution log: {str(e)}"}
            )

    def _finalize_execution_log(self, final_results: Dict[str, Any]) -> None:
        """
        Finalize the execution log with final results and status.
        """
        if not self.execution_log_file:
            return

        try:
            # Read current log
            with open(self.execution_log_file, "r", encoding="utf-8") as f:
                log_data = json.load(f)

            # Update final data
            log_data["updated_at"] = datetime.now().isoformat()
            log_data["status"] = "completed"
            log_data["final_results"] = to_json_serializable(final_results)

            # Write final log
            with open(self.execution_log_file, "w", encoding="utf-8") as f:
                json.dump(log_data, f, indent=2, ensure_ascii=False)

            Logger.info(
                self.sketch_id,
                {
                    "message": f"Transform execution log finalized at {self.execution_log_file}"
                },
            )

        except Exception as e:
            Logger.error(
                self.sketch_id,
                {"message": f"Failed to finalize execution log: {str(e)}"},
            )

    def _save_transform_branches(self) -> None:
        """
        Save the transform branches to a JSON file for debugging and persistence.
        """
        try:
            # Create a directory for storing transform files if it doesn't exist
            transform_dir = "transform_logs"
            os.makedirs(transform_dir, exist_ok=True)

            # Create filename with sketch_id and scan_id
            filename = f"transform_branches_{self.sketch_id}_{self.scan_id}.json"
            filepath = os.path.join(transform_dir, filename)

            # Serialize the transform branches
            serialized_branches = to_json_serializable(self.transform_branches)

            # Save to JSON file
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "sketch_id": self.sketch_id,
                        "scan_id": self.scan_id,
                        "timestamp": datetime.now().isoformat(),
                        "transform_branches": serialized_branches,
                    },
                    f,
                    indent=2,
                    ensure_ascii=False,
                )

            Logger.info(
                self.sketch_id, {"message": f"Transform branches saved to {filepath}"}
            )

        except Exception as e:
            Logger.error(
                self.sketch_id,
                {"message": f"Failed to save transform branches: {str(e)}"},
            )

    def _load_transforms(self) -> None:
        if not self.transform_branches:
            raise ValueError("No transform branches provided")

        # Collect all transform nodes across all branches
        transform_nodes = []
        for branch in self.transform_branches:
            for step in branch.steps:
                if step.type == "type":
                    continue
                transform_nodes.append(step)

        if not transform_nodes:
            raise ValueError("No transform nodes found in transform branches")

        # Create transform instances for each node
        for node in transform_nodes:
            node_id = node.nodeId

            # Extract transform name from nodeId (assuming format like "transform_name-1234567890")
            transform_name = node_id.split("-")[0]

            if not TransformRegistry.transform_exists(transform_name):
                raise ValueError(f"Transform '{transform_name}' not found in registry")

            # Pass the step params to the transform instance
            transform_params = (
                node.params if hasattr(node, "params") and node.params else {}
            )
            transform = TransformRegistry.get_transform(
                transform_name,
                self.sketch_id,
                self.scan_id,
                neo4j_conn=self.neo4j_conn,
                vault=self.vault,
                params=transform_params,
            )
            self.transforms[node_id] = transform

    def resolve_reference(self, ref_value: str, results_mapping: Dict[str, Any]) -> Any:
        """
        Resolve a reference value from the results mapping.
        References could be just the key name like "transformed_domain".
        """
        if ref_value in results_mapping:
            return results_mapping[ref_value]
        return None

    def prepare_transform_inputs(
        self, step: FlowStep, results_mapping: Dict[str, Any], initial_values: List[str]
    ) -> List[Any]:
        """
        Prepare the inputs for a transform based on the references and previous results.
        Handles single references, lists, and direct values.
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
            transform = self.transforms.get(step.nodeId)
            if transform:
                primary_key = transform.key()
                return {primary_key: initial_values}
        else:
            transform = self.transforms.get(step.nodeId)
        return inputs[input_key]

    def update_results_mapping(
        self,
        outputs: Dict[str, Any],
        step_outputs: Dict[str, str],
        results_mapping: Dict[str, Any],
    ) -> None:
        """
        Update the results mapping with new outputs from a transform.
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
        return {"branches": "array", "results": "dict"}

    def scan(self, values: List[str]) -> Dict[str, Any]:
        """
        Synchronous implementation of scan that runs the async version in an event loop
        """
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            results = loop.run_until_complete(self._async_scan(values))
            return results
        finally:
            loop.close()

    async def _async_scan(self, values: List[str]) -> Dict[str, Any]:
        """
        The actual async implementation of the scan logic
        """
        # Update execution log to indicate scan has started
        self._update_execution_log(None, "running")

        results = {"initial_values": values, "branches": [], "results": {}}
        Logger.pending(self.sketch_id, {"message": "Starting transform..."})

        # Global mapping of output references to actual values
        results_mapping = {}
        # Cache for transform results to avoid recomputation
        transform_results_cache = {}

        total_steps = sum(len(branch.steps) for branch in self.transform_branches)
        completed_steps = 0

        # Process each branch
        for branch in self.transform_branches:
            branch_id = branch.id
            branch_name = branch.name
            branch_results = {"id": branch_id, "name": branch_name, "steps": []}

            # Process each step in the branch
            transform_inputs = values
            for step in branch.steps:
                if step.type == "type":
                    continue

                node_id = step.nodeId
                transform = self.transforms.get(node_id)

                if not transform:
                    Logger.error(
                        self.sketch_id,
                        {"message": f"Transform not found for node {node_id}"},
                    )
                    continue

                transform_name = transform.name()
                step_start_time = time.time()

                step_result = {
                    "nodeId": node_id,
                    "transform": transform_name,
                    "status": "error",  # Default to error, will update on success
                }

                # Create execution log entry
                log_entry = {
                    "step_id": f"{branch_id}_{node_id}",
                    "branch_id": branch_id,
                    "branch_name": branch_name,
                    "node_id": node_id,
                    "transform_name": transform_name,
                    "inputs": to_json_serializable(transform_inputs),
                    "outputs": None,
                    "status": "running",
                    "error": None,
                    "timestamp": datetime.now().isoformat(),
                    "execution_time_ms": 0,
                }

                try:
                    # Update status for current step
                    completed_steps += 1
                    if not transform_inputs:
                        error_msg = "No inputs available"
                        step_result["error"] = error_msg
                        log_entry["status"] = "error"
                        log_entry["error"] = error_msg
                        log_entry["execution_time_ms"] = int(
                            (time.time() - step_start_time) * 1000
                        )
                        self._update_execution_log(log_entry)
                        branch_results["steps"].append(step_result)
                        continue

                    # Check if we already have results for this transform with these inputs
                    cache_key = f"{node_id}:{str(transform_inputs)}"
                    if cache_key in transform_results_cache:
                        outputs = transform_results_cache[cache_key]
                        log_entry["cache_hit"] = True
                    else:
                        # Execute the transform
                        outputs = await transform.execute(transform_inputs)
                        if not isinstance(outputs, (dict, list)):
                            raise ValueError(
                                f"Transform '{transform_name}' returned unsupported output format"
                            )
                        # Cache the results
                        transform_results_cache[cache_key] = outputs
                        log_entry["cache_hit"] = False

                    # Store the outputs in the step result (serialize to avoid JSON issues)
                    step_result["outputs"] = to_json_serializable(outputs)
                    step_result["status"] = "completed"

                    # Update log entry with success
                    log_entry["outputs"] = to_json_serializable(outputs)
                    log_entry["status"] = "completed"
                    log_entry["execution_time_ms"] = int(
                        (time.time() - step_start_time) * 1000
                    )

                    # Update the global results mapping with the outputs
                    self.update_results_mapping(outputs, step.outputs, results_mapping)
                    # Also store the raw outputs in the main results
                    results["results"][node_id] = outputs
                    transform_inputs = outputs

                except ValidationError as e:
                    error_msg = f"Validation error: {str(e)}"
                    Logger.error(self.sketch_id, {"message": error_msg})
                    step_result["error"] = error_msg
                    log_entry["status"] = "error"
                    log_entry["error"] = error_msg
                    log_entry["execution_time_ms"] = int(
                        (time.time() - step_start_time) * 1000
                    )
                    results["results"][node_id] = {"error": error_msg}
                    self._update_execution_log(log_entry)
                    return results

                except Exception as e:
                    error_msg = f"Error during scan: {str(e)}"
                    Logger.error(self.sketch_id, {"message": error_msg})
                    step_result["error"] = error_msg
                    log_entry["status"] = "error"
                    log_entry["error"] = error_msg
                    log_entry["execution_time_ms"] = int(
                        (time.time() - step_start_time) * 1000
                    )
                    results["results"][node_id] = {"error": error_msg}
                    self._update_execution_log(log_entry)
                    return results

                # Update execution log with this step
                self._update_execution_log(log_entry)
                branch_results["steps"].append(step_result)

            results["branches"].append(branch_results)

        Logger.completed(
            self.sketch_id, {"message": "Transform completed successfully."}
        )

        # Include the final reference mapping for debugging
        results["reference_mapping"] = results_mapping

        # Finalize execution log
        self._finalize_execution_log(results)

        return results
