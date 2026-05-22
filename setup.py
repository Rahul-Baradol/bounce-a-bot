import os
import subprocess
from pathlib import Path

def run(cmd, cwd=None):
    print(f"\n➜ {cmd}")
    subprocess.run(cmd, shell=True, cwd=cwd, check=True)

def copy_env(src, dst):
    src, dst = Path(src), Path(dst)
    if src.exists():
        dst.write_text(src.read_text())
        print(f"✔ {dst} created")
    else:
        print(f"⚠ {src} not found")

def main():
    repo_root = Path.cwd()

    print("➡ Checking Docker...")
    if os.system("docker --version > /dev/null 2>&1") != 0:
        raise SystemExit("Docker not installed")

    print("➡ Setting up env files...")
    copy_env("frontend/.env.example", "frontend/.env")
    copy_env("backend/.env.example", "backend/.env")

    print("➡ Frontend install + build...")
    run("npm install", cwd="frontend")
    run("npm run build", cwd="frontend")

    print("➡ Backend setup...")
    run("python3 -m venv .venv", cwd="backend")

    activate = repo_root / "backend" / ".venv" / "bin" / "activate"

    run(
        f"bash -c 'source {activate} && pip install --upgrade pip && pip install -r requirements.txt'",
        cwd="backend"
    )

    print("\n✅ Done")

if __name__ == "__main__":
    main()