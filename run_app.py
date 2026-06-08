import subprocess
import sys
import time
import os
import platform
import re

import socket

def is_port_listening(port, host='127.0.0.1'):
    """Checks if a port is listening on the specified host."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((host, port)) == 0

def kill_process_on_port(port):
    """Kills any process running on the specified port."""
    is_windows = platform.system() == "Windows"
    if is_windows:
        try:
            # Find PID using netstat
            output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode()
            pids = set(re.findall(r"LISTENING\s+(\d+)", output))
            for pid in pids:
                if pid != "0":
                    print(f"⚠️ Port {port} is occupied by PID {pid}. Terminating...")
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, check=False)
        except Exception:
            pass # Port probably not in use
    else:
        try:
            subprocess.run(f"kill $(lsof -t -i :{port})", shell=True, stderr=subprocess.DEVNULL, check=False)
        except Exception:
            pass

def run_app():
    print("🚀 Starting Viking GenAI Automation Framework...")

    # Check dependencies
    print("📦 Checking Python dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("✅ Python dependencies verified.")
    except Exception as e:
        print(f"⚠️ Warning: Could not verify Python dependencies: {e}")

    # Port cleanup
    kill_process_on_port(8000)
    kill_process_on_port(3000)

    # Determine npm command based on platform
    is_windows = platform.system() == "Windows"
    npm_cmd = "npm.cmd" if is_windows else "npm"

    frontend_dir = os.path.join(os.getcwd(), "frontend")
    node_modules_dir = os.path.join(frontend_dir, "node_modules")

    # Check if node_modules exists
    if not os.path.exists(node_modules_dir):
        print("📦 node_modules missing. Running 'npm install' in frontend directory...")
        try:
            subprocess.run([npm_cmd, "install"], cwd=frontend_dir, check=True, shell=False)
            print("✅ npm install completed.")
        except subprocess.CalledProcessError as e:
            print(f"❌ npm install failed: {e}")
            print("Please run 'npm install' manually in the /frontend directory.")
            return

    # Start Backend
    print("📦 Starting Backend (FastAPI) on port 8000...")
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=os.getcwd(),
        shell=False
    )

    # Wait for backend to be ready
    print("⏳ Waiting for Backend to be ready...")
    retries = 30
    while retries > 0:
        if is_port_listening(8000):
            print("✅ Backend is ready.")
            break
        time.sleep(1)
        retries -= 1
    
    if retries == 0:
        print("❌ Backend failed to start in time.")
        backend_process.terminate()
        return

    # Start Frontend
    print(f"🌐 Starting Frontend (Vite) using {npm_cmd} on port 3000...")
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir,
        shell=False
    )

    print("\n✅ Automation is now running!")
    print("👉 Frontend: http://localhost:3000")
    print("👉 Backend:  http://localhost:8000")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            # Check if processes are still running
            if backend_process.poll() is not None:
                print("❌ Backend process stopped unexpectedly.")
                break
            if frontend_process.poll() is not None:
                print("❌ Frontend process stopped unexpectedly.")
                break
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n🛑 Stopping Automation...")
    finally:
        # Graceful shutdown
        if backend_process.poll() is None:
            backend_process.terminate()
        if frontend_process.poll() is None:
            frontend_process.terminate()
        print("Done.")

if __name__ == "__main__":
    run_app()
