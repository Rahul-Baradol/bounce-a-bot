import os
import subprocess
import sys
from pathlib import Path

PROJECT_DIR = "bounce-a-bot"

def run(cmd, cwd=None, check=True):
    print(f"\n➜ {cmd}")
    subprocess.run(cmd, shell=True, cwd=cwd, check=check)

def file_copy(src, dst):
    src_path = Path(src)
    dst_path = Path(dst)

    if src_path.exists():
        dst_path.write_text(src_path.read_text())
        print(f"✔ Created {dst}")
    else:
        print(f"⚠ Missing {src}, skipping")

def main():
    project_path = Path(PROJECT_DIR)

    if not project_path.exists():
        print("❌ bounce-a-bot folder not found")
        sys.exit(1)

    print("➡ Entering project directory")

    # Check docker
    if os.system("docker --version > /dev/null 2>&1") != 0:
        print("❌ Docker not installed")
        sys.exit(1)

    # Move to project
    os.chdir(project_path)

    print("\n➡ Copying .env files")
    file_copy("frontend/.env.example", "frontend/.env")
    file_copy("backend/.env.example", "backend/.env")

    print("\n➡ Frontend setup")
    run("npm install", cwd="frontend")
    run("npm run build", cwd="frontend")

    print("\n➡ Backend setup")

    venv_path = Path("backend/.venv")

    run("python3 -m venv .venv", cwd="backend")

    activate = venv_path / "bin" / "activate"

    pip_install = (
        f"source {activate} && "
        "pip install --upgrade pip && "
        "pip install -r requirements.txt"
    )

    run(pip_install, cwd="backend")

    print("\n✅ Setup complete!")

if __name__ == "__main__":
    main()