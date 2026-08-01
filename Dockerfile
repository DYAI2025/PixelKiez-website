# Statische Seite, kein Build-Step. Caddy liefert sie aus und hoert auf $PORT,
# das Railway zur Laufzeit setzt.
FROM caddy:2-alpine

COPY site/ /srv/
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
