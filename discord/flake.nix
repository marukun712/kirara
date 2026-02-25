{
  description = "Shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        appSource = pkgs.runCommand "discord-source" { } ''
          mkdir -p "$out/app"
          cp -r ${./.}/. $out/app/
        '';

        imageRoot = pkgs.buildEnv {
          name = "discord-image-root";
          paths = [
            appSource
            pkgs.nix
            pkgs.bash
          ];
        };
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = [
            pkgs.bun
          ];
        };

        packages.default = pkgs.dockerTools.buildImage {
          name = "kirara-discord";
          tag = "latest";
          copyToRoot = imageRoot;
          runAsRoot = ''
            mkdir -p /etc/nix
            echo "experimental-features = nix-command flakes" > /etc/nix/nix.conf
          '';
          config = {
            WorkingDir = "/app";
            Cmd = [
              "nix"
              "develop"
              "--command"
              "bun"
              "index"
            ];
          };
        };
      }
    );
}
