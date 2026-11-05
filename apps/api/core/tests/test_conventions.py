"""Code conventions that ruff cannot check."""

import ast
import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

API_ROOT = Path(settings.BASE_DIR)
SKIPPED_DIRS = {".venv", "migrations", "__pycache__"}


def model_names() -> set[str]:
    """Returns the class name of every model, read from the model files."""
    names = set()
    for path in API_ROOT.glob("*/models/*/model.py"):
        names.update(re.findall(r"^class (\w+)\(BaseModel", path.read_text(), re.M))
    return names


def is_id(arg: ast.arg, models: set[str]) -> bool:
    """True for a parameter that identifies rows: `*_id`, `*_ids`, `ids`, or a model instance."""
    if arg.arg == "ids" or arg.arg.endswith(("_id", "_ids")):
        return True
    annotation = ast.unparse(arg.annotation) if arg.annotation else ""
    return any(re.search(rf"\b{name}\b", annotation) for name in models)


def expected_order(func: ast.FunctionDef, models: set[str]) -> list[str]:
    """Required ids, required values, optional ids, optional values; each group alphabetical."""
    params = zip(func.args.kwonlyargs, func.args.kw_defaults, strict=True)
    return [
        arg.arg
        for arg, _ in sorted(params, key=lambda p: (p[1] is not None, not is_id(p[0], models), p[0].arg))
    ]


class KeywordOnlyParameterOrderTests(SimpleTestCase):
    """Keyword-only parameters are ordered: required ids, required values, optional ids, optional values."""

    def test_every_function_follows_the_order(self):
        """Each group is alphabetical. See .ai/rules/core.md, "Parameter order"."""
        models = model_names()
        violations = []
        for path in sorted(API_ROOT.rglob("*.py")):
            if SKIPPED_DIRS & set(path.relative_to(API_ROOT).parts):
                continue
            for node in ast.walk(ast.parse(path.read_text())):
                if (
                    not isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef)
                    or len(node.args.kwonlyargs) < 2
                ):
                    continue
                actual = [arg.arg for arg in node.args.kwonlyargs]
                expected = expected_order(node, models)
                if actual != expected:
                    violations.append(
                        f"{path.relative_to(API_ROOT)}:{node.lineno} {node.name}: ({', '.join(expected)})"
                    )
        self.assertEqual(violations, [], "Reorder these keyword-only parameters:\n" + "\n".join(violations))
