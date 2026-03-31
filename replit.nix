{ pkgs }:
{
  deps = [
    pkgs.nodejs_22
    pkgs.ffmpeg
    pkgs.openssl
    pkgs.pkg-config
    pkgs.python3
  ];
}
