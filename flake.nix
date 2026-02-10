{
  description = "Spacetime Simulator - Astro dev shell with Node + pnpm";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_20
            pnpm
          ];

          shellHook = ''
            echo "Spacetime Simulator dev shell"
            echo ""
            echo "Commands:"
            echo "  pnpm dev     - Start Astro dev server (port 4321)"
            echo "  pnpm build   - Build for production"
            echo "  pnpm preview - Preview production build"
            echo ""
            echo "Node: $(node -v)"
            echo "pnpm: $(pnpm -v)"
          '';
        };
      }
    );
}
