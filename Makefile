.PHONY: install dev lint format test typecheck security audit ci run clean

PY ?= python

install:
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -e .

dev:
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -e ".[dev]"

lint:
	ruff check .
	ruff format --check .

format:
	ruff format .
	ruff check --fix .

test:
	pytest

typecheck:
	mypy

security:
	bandit -c pyproject.toml -r src

audit:
	pip-audit --skip-editable --progress-spinner off

ci: lint typecheck test security audit

run:
	streamlit run src/email_analyzer/app.py

clean:
	rm -rf build dist *.egg-info .pytest_cache .ruff_cache .mypy_cache htmlcov coverage.xml .coverage
	find . -type d -name __pycache__ -exec rm -rf {} +
