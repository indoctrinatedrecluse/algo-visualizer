# No system-level packages are needed: Replit provides the Python runtime and
# installs the pip dependencies (fastapi, uvicorn, websockets) from
# requirements.txt. Keep `deps` empty so the Nix build never fails on a
# version that is missing from Replit's channel.
{ pkgs }: {
  deps = [ ];
}

