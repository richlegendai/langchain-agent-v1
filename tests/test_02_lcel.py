from __future__ import annotations

import ast
from pathlib import Path
from typing import Final


SCRIPT_PATH: Final = Path(__file__).parents[1] / "project" / "02_lcel.py"


def test_notebook_examples_are_converted_to_seventeen_functions() -> None:
    source = SCRIPT_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)

    example_functions = [
        node.name
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name.startswith("example_")
    ]

    assert example_functions == [f"example_{number:02d}" for number in range(1, 18)]


def test_example_12_streams_each_batch_input_after_batch_output() -> None:
    source = SCRIPT_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    example_12 = next(
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name == "example_12"
    )

    stream_calls = [
        node
        for node in ast.walk(example_12)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "stream"
    ]

    assert "[스트리밍 출력]" in ast.get_source_segment(source, example_12)
    assert len(stream_calls) == 1
