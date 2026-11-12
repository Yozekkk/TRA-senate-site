{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  packages = with pkgs; [
    nodejs_26
    git
    chromium
    postgresql_17
    supabase-cli
  ];
}
