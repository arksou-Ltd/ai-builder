"""Dependency Chain Verification Tests - Anti-regression Automation.

Verifies core dependency chain configuration is correct to prevent
accidental breakage of dependency constraints in future development.
No Mock/Stub/Fake allowed - all tests must use real dependencies.
"""

import importlib.metadata
import sys
import tomllib
from pathlib import Path

import pytest
from packaging.version import Version


def get_backend_root() -> Path:
    """Get backend root directory path."""
    # Test file is at backend/app-api/tests/
    return Path(__file__).parent.parent.parent


def load_toml(path: Path) -> dict:
    """Load and parse TOML file with explicit UTF-8 encoding."""
    return tomllib.loads(path.read_text(encoding="utf-8"))


class TestDependencyChainVersion:
    """Dependency version verification tests."""

    def test_arksou_kernel_framework_version(self) -> None:
        """arksou-kernel-framework version must be exactly 0.3.5 (tag v0.3.6)."""
        version = importlib.metadata.version("arksou-kernel-framework")
        assert version == "0.3.5", (
            f"arksou-kernel-framework version mismatch: expected 0.3.5, got {version}"
        )

    def test_fastapi_minimum_version(self) -> None:
        """fastapi version must be >= 0.115.0."""
        version_str = importlib.metadata.version("fastapi")
        version = Version(version_str)
        minimum = Version("0.115.0")
        assert version >= minimum, (
            f"fastapi version too low: expected >= 0.115.0, got {version_str}"
        )

    def test_uvicorn_minimum_version(self) -> None:
        """uvicorn version must be >= 0.34.0."""
        version_str = importlib.metadata.version("uvicorn")
        version = Version(version_str)
        minimum = Version("0.34.0")
        assert version >= minimum, (
            f"uvicorn version too low: expected >= 0.34.0, got {version_str}"
        )

    def test_sqlalchemy_minimum_version(self) -> None:
        """sqlalchemy version must be >= 2.0.46."""
        version_str = importlib.metadata.version("sqlalchemy")
        version = Version(version_str)
        minimum = Version("2.0.46")
        assert version >= minimum, (
            f"sqlalchemy version too low: expected >= 2.0.46, got {version_str}"
        )

    def test_asyncpg_minimum_version(self) -> None:
        """asyncpg version must be >= 0.30.0."""
        version_str = importlib.metadata.version("asyncpg")
        version = Version(version_str)
        minimum = Version("0.30.0")
        assert version >= minimum, (
            f"asyncpg version too low: expected >= 0.30.0, got {version_str}"
        )

    def test_alembic_minimum_version(self) -> None:
        """alembic version must be >= 1.17.0."""
        version_str = importlib.metadata.version("alembic")
        version = Version(version_str)
        minimum = Version("1.17.0")
        assert version >= minimum, (
            f"alembic version too low: expected >= 1.17.0, got {version_str}"
        )

    def test_pyjwt_minimum_version(self) -> None:
        """pyjwt version must be >= 2.10.0."""
        version_str = importlib.metadata.version("pyjwt")
        version = Version(version_str)
        minimum = Version("2.10.0")
        assert version >= minimum, (
            f"pyjwt version too low: expected >= 2.10.0, got {version_str}"
        )


class TestDependencySourceConfiguration:
    """Dependency source configuration verification tests.

    These tests verify the CRITICAL configuration constraints using
    structured TOML parsing (not string matching):
    - arksou-kernel-framework must come from Git SSH source with tag v0.3.6
    - common-kernel must use workspace source
    """

    def test_common_kernel_git_ssh_source_in_pyproject(self) -> None:
        """common-kernel/pyproject.toml must use Git SSH source for framework."""
        backend_root = get_backend_root()
        pyproject_path = backend_root / "common-kernel" / "pyproject.toml"

        assert pyproject_path.exists(), f"File not found: {pyproject_path}"

        config = load_toml(pyproject_path)

        # Verify arksou-kernel-framework in dependencies
        dependencies = config.get("project", {}).get("dependencies", [])
        has_framework = any(
            "arksou-kernel-framework" in dep for dep in dependencies
        )
        assert has_framework, (
            "arksou-kernel-framework must be in common-kernel dependencies"
        )

        # Verify Git SSH source configuration (structured)
        sources = config.get("tool", {}).get("uv", {}).get("sources", {})
        framework_source = sources.get("arksou-kernel-framework", {})

        assert "git" in framework_source, (
            "arksou-kernel-framework must use git source"
        )
        assert "ssh://git@github-arksou" in framework_source["git"], (
            "arksou-kernel-framework must use Git SSH source (ssh://git@github-arksou)"
        )
        assert framework_source.get("tag") == "v0.3.6", (
            f"arksou-kernel-framework must be pinned to tag v0.3.6, "
            f"got: {framework_source.get('tag')}"
        )

    def test_app_api_workspace_source_in_pyproject(self) -> None:
        """app-api/pyproject.toml must use workspace source for common-kernel."""
        backend_root = get_backend_root()
        pyproject_path = backend_root / "app-api" / "pyproject.toml"

        assert pyproject_path.exists(), f"File not found: {pyproject_path}"

        config = load_toml(pyproject_path)

        # Verify workspace source configuration (structured)
        sources = config.get("tool", {}).get("uv", {}).get("sources", {})
        common_kernel_source = sources.get("common-kernel", {})

        assert common_kernel_source.get("workspace") is True, (
            "common-kernel must use workspace source: { workspace = true }"
        )

    def test_uv_lock_contains_git_source_with_tag(self) -> None:
        """uv.lock must contain Git source with tag v0.3.6 for arksou-kernel-framework."""
        backend_root = get_backend_root()
        uv_lock_path = backend_root / "uv.lock"

        assert uv_lock_path.exists(), f"File not found: {uv_lock_path}"

        content = uv_lock_path.read_text(encoding="utf-8")

        # Verify arksou-kernel-framework is present
        assert "arksou-kernel-framework" in content, (
            "arksou-kernel-framework not found in uv.lock"
        )

        # Verify Git SSH source (not PyPI registry)
        # uv.lock format: source = { git = "ssh://git@github-arksou/..." }
        assert 'git = "ssh://git@github-arksou' in content, (
            "arksou-kernel-framework must come from Git SSH source in uv.lock"
        )

        # Verify tag v0.3.6 is locked in the git URL
        # uv.lock format: ...?tag=v0.3.6#<commit_sha>
        assert "tag=v0.3.6" in content, (
            "arksou-kernel-framework must be pinned to tag v0.3.6 in uv.lock"
        )

    def test_workspace_members_exact_configuration(self) -> None:
        """backend/pyproject.toml workspace members must be exactly common-kernel and app-api."""
        backend_root = get_backend_root()
        pyproject_path = backend_root / "pyproject.toml"

        assert pyproject_path.exists(), f"File not found: {pyproject_path}"

        config = load_toml(pyproject_path)

        # Verify workspace members (structured, exact match)
        members = config.get("tool", {}).get("uv", {}).get("workspace", {}).get("members", [])
        expected_members = {"common-kernel", "app-api"}

        assert set(members) == expected_members, (
            f"workspace members must be exactly {expected_members}, "
            f"got: {set(members)}"
        )


class TestDependencyChainImport:
    """Dependency chain import verification tests."""

    def test_arksou_module_import(self) -> None:
        """arksou module must be importable."""
        import arksou  # noqa: F401

    def test_arksou_kernel_framework_base_import(self) -> None:
        """arksou.kernel.framework.base core components must be importable."""
        from arksou.kernel.framework.base import Result, Code, BaseSchema  # noqa: F401

    def test_arksou_exception_import(self) -> None:
        """arksou exception hierarchy must be importable."""
        from arksou.kernel.framework.base import (  # noqa: F401
            BusinessException,
            NotFoundException,
        )

    def test_common_kernel_import(self) -> None:
        """common-kernel module must be importable."""
        import kernel.common  # noqa: F401

        # Only verify module is importable, no version assertion

    def test_app_api_import(self) -> None:
        """app-api main module must be importable."""
        from api.app.main import app  # noqa: F401


class TestAgentKernelProhibition:
    """agent-kernel prohibition verification tests.

    Story requirement: repository must not contain backend/agent-kernel/
    and no configuration/dependency should reference it.
    """

    def test_agent_kernel_directory_not_exists(self) -> None:
        """backend/agent-kernel/ directory must not exist."""
        backend_root = get_backend_root()
        agent_kernel_path = backend_root / "agent-kernel"
        assert not agent_kernel_path.exists(), (
            f"Prohibited directory exists: {agent_kernel_path}"
        )

    def test_no_agent_kernel_in_pyproject_files(self) -> None:
        """pyproject.toml files must not reference agent-kernel."""
        backend_root = get_backend_root()
        pyproject_files = [
            backend_root / "pyproject.toml",
            backend_root / "common-kernel" / "pyproject.toml",
            backend_root / "app-api" / "pyproject.toml",
        ]

        for pyproject_path in pyproject_files:
            if pyproject_path.exists():
                config = load_toml(pyproject_path)

                # Check workspace members
                members = (
                    config.get("tool", {})
                    .get("uv", {})
                    .get("workspace", {})
                    .get("members", [])
                )
                assert "agent-kernel" not in members, (
                    f"agent-kernel found in workspace members: {pyproject_path}"
                )

                # Check dependencies
                dependencies = config.get("project", {}).get("dependencies", [])
                has_agent_kernel = any(
                    "agent-kernel" in dep for dep in dependencies
                )
                assert not has_agent_kernel, (
                    f"agent-kernel found in dependencies: {pyproject_path}"
                )

                # Check sources
                sources = config.get("tool", {}).get("uv", {}).get("sources", {})
                assert "agent-kernel" not in sources, (
                    f"agent-kernel found in sources: {pyproject_path}"
                )

    def test_no_agent_kernel_in_uv_lock(self) -> None:
        """uv.lock must not reference agent-kernel."""
        backend_root = get_backend_root()
        uv_lock_path = backend_root / "uv.lock"

        if uv_lock_path.exists():
            content = uv_lock_path.read_text(encoding="utf-8")
            # Check for package name (not just any mention)
            assert "name = \"agent-kernel\"" not in content, (
                f"agent-kernel package found in: {uv_lock_path}"
            )

    def test_no_agent_kernel_import(self) -> None:
        """Python code must not be able to import agent_kernel."""
        # Attempting import should fail - this is expected behavior
        with pytest.raises(ModuleNotFoundError):
            import agent_kernel  # type: ignore[import-not-found]  # noqa: F401


class TestPythonVersionConstraint:
    """Python version constraint verification tests."""

    def test_python_version_file_content(self) -> None:
        """.python-version file content must be exactly '3.12'."""
        backend_root = get_backend_root()
        python_version_file = backend_root / ".python-version"

        assert python_version_file.exists(), ".python-version file not found"

        content = python_version_file.read_text(encoding="utf-8").strip()
        assert content == "3.12", (
            f".python-version content error: expected '3.12', got '{content}'"
        )

    def test_python_runtime_version(self) -> None:
        """Python runtime version must be >= 3.12."""
        assert sys.version_info >= (3, 12), (
            f"Python version too low: expected >= 3.12, got {sys.version_info}"
        )
