FROM nixos/nix

WORKDIR /app
COPY . .

RUN mkdir -p /etc/nix && \
    echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf

CMD ["nix", "develop", "--command", "bun", "index"]
