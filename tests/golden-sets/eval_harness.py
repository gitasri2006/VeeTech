"""
VeriScope Golden-Set Evaluation Harness
Compliant with TRD Section 10 (Evaluation Strategy) and PRD Section 3 (Target Metrics)

Evaluates Contextual Validation Agent against curated benchmark datasets.
Calculates: Precision, Recall, F1 Score, Accuracy, and Routing Action Breakdown.
"""

import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from services.common.gemini_client import gemini_client



logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("veriscope.eval")


class EvaluationHarness:
    def __init__(self, golden_set_path: str):
        self.path = Path(golden_set_path)
        with open(self.path, "r", encoding="utf-8") as f:
            self.dataset: List[Dict[str, Any]] = json.load(f)

    def run_evaluation(self) -> Dict[str, Any]:
        true_positives = 0
        false_positives = 0
        true_negatives = 0
        false_negatives = 0

        routing_counts = {"auto_approved": 0, "analyst_review": 0, "auto_rejected": 0}
        results = []

        for item in self.dataset:
            entity_name = item["entity_name"]
            disambiguation_context = item["disambiguation_context"]
            exclusion_terms = item.get("exclusion_terms", [])
            text = f"{item['article_title']}\n{item['article_text']}"
            ground_truth_relevant = item["ground_truth_relevant"]

            llm_res = gemini_client.validate_context(
                entity_name=entity_name,
                disambiguation_context=disambiguation_context,
                exclusion_terms=exclusion_terms,
                text=text,
            )

            predicted_relevant = llm_res.get("relevant", True)
            confidence = llm_res.get("confidence", 0.5)

            # Routing decision
            if not predicted_relevant or confidence < 0.50:
                routing = "auto_rejected"
            elif confidence >= 0.85:
                routing = "auto_approved"
            else:
                routing = "analyst_review"

            routing_counts[routing] += 1

            # Metric matrix
            if predicted_relevant and ground_truth_relevant:
                true_positives += 1
            elif predicted_relevant and not ground_truth_relevant:
                false_positives += 1
            elif not predicted_relevant and not ground_truth_relevant:
                true_negatives += 1
            elif not predicted_relevant and ground_truth_relevant:
                false_negatives += 1

            results.append({
                "id": item["id"],
                "entity": entity_name,
                "ground_truth": ground_truth_relevant,
                "predicted": predicted_relevant,
                "confidence": confidence,
                "routing": routing,
                "reason": llm_res.get("reason", "")
            })

        total = len(self.dataset)
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        accuracy = (true_positives + true_negatives) / total if total > 0 else 0.0

        metrics = {
            "total_evaluated": total,
            "true_positives": true_positives,
            "false_positives": false_positives,
            "true_negatives": true_negatives,
            "false_negatives": false_negatives,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(accuracy, 4),
            "routing_distribution": routing_counts,
            "target_precision_met": precision >= 0.85,
            "target_recall_met": recall >= 0.60,
        }

        return {"metrics": metrics, "item_results": results}


if __name__ == "__main__":
    golden_path = Path(__file__).parent / "contextual_validation_golden_set.json"
    harness = EvaluationHarness(str(golden_path))
    report = harness.run_evaluation()
    print("=== Golden Set Evaluation Baseline Report ===")
    print(json.dumps(report["metrics"], indent=2))
