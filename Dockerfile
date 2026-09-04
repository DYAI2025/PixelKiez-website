# Zweistufig: erst wird gebaut, dann ausgeliefert. Das Image enthaelt am Ende
# weder Node noch node_modules — nur das Ergebnis aus dist/ und Caddy.
#
# Wichtig: kein --omit=optional bei npm ci. esbuild bezieht seine
# Plattformbinaerdatei ueber optionalDependencies; ohne sie bricht der Build.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY site/ ./site/
COPY scripts/ ./scripts/
RUN npm run build

# Der Build bricht bei jedem Einbettungsfehler selbst ab (siehe pruefe() in
# scripts/build.mjs). Hier nur noch die Gegenprobe, dass etwas entstanden ist.
RUN test -f dist/index.html && test -d dist/assets/fonts

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

# Das offizielle Caddy-Alpine-Image startet standardmaessig als root. Fuer
# statische Auslieferung und Reverse-Proxying braucht Pixelkiez keine Root-
# Identitaet. Das Basisimage setzt cap_net_bind_service auf das Caddy-Binary
# und stellt /config/caddy sowie /data/caddy beschreibbar bereit.
RUN addgroup -S caddy-runtime \
    && adduser -S -D -H -G caddy-runtime caddy-runtime
USER caddy-runtime

EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
