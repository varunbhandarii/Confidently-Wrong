{ pkgs }:
{
  deps = [
    pkgs.nodejs_20
    pkgs.ffmpeg
    pkgs.openssl
    pkgs.pkg-config
    pkgs.python3
  ];
}
