```markdown
# flowsint Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `flowsint` Python codebase. You'll learn how to structure files, write and organize code, follow commit message conventions, and run tests. The repository uses a clean, framework-agnostic approach with a focus on maintainable, readable code and conventional commit messages.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `dataProcessor.py`, `userFlowHandler.py`

### Imports
- Use **relative imports** within the package.
  - Example:
    ```python
    from .utils import parseData
    from .models import UserModel
    ```

### Exports
- Use **named exports** (explicitly listing what is exported).
  - Example:
    ```python
    __all__ = ['UserModel', 'parseData']
    ```

### Commit Messages
- Follow **conventional commit** patterns.
- Use prefixes like `fix` and `feat`.
- Keep commit messages concise (~59 characters on average).
  - Example:
    ```
    feat: add user flow handler for onboarding process
    fix: correct data parsing in utils module
    ```

## Workflows

### Creating a New Feature
**Trigger:** When adding new functionality  
**Command:** `/new-feature`

1. Create a new Python file using camelCase naming.
2. Implement the feature with relative imports as needed.
3. Export relevant functions/classes using `__all__`.
4. Write or update tests in a corresponding `*.test.*` file.
5. Commit changes with a `feat:` prefix and a concise description.

### Fixing a Bug
**Trigger:** When correcting an issue or bug  
**Command:** `/bug-fix`

1. Locate the affected code.
2. Apply the fix, maintaining code style and conventions.
3. Update or add tests to cover the fix.
4. Commit changes with a `fix:` prefix and a concise description.

### Running Tests
**Trigger:** To verify code correctness  
**Command:** `/run-tests`

1. Identify all files matching the `*.test.*` pattern.
2. Run tests using your preferred Python test runner (e.g., `pytest`, `unittest`).
   - Example:
     ```bash
     python -m unittest discover -p "*.test.*"
     ```
3. Review test results and address any failures.

## Testing Patterns

- Test files follow the pattern `*.test.*` (e.g., `userFlow.test.py`).
- The testing framework is not specified; use standard Python testing tools.
- Place tests alongside or near the modules they cover.
- Example test file structure:
  ```python
  # userFlow.test.py
  import unittest
  from .userFlowHandler import processUserFlow

  class TestUserFlow(unittest.TestCase):
      def test_onboarding(self):
          result = processUserFlow('onboarding')
          self.assertTrue(result)
  ```

## Commands
| Command        | Purpose                                   |
|----------------|-------------------------------------------|
| /new-feature   | Scaffold and commit a new feature         |
| /bug-fix       | Apply and commit a bug fix                |
| /run-tests     | Run all tests in the codebase             |
```
