# Formular-Gegenstelle. Eigener Railway-Dienst, getrennt von der Website:
# faellt er aus, bleibt die Seite erreichbar und das Formular weicht auf den
# E-Mail-Pfad aus.
#
# Die Pfade sind bewusst vom Projektstamm aus geschrieben, nicht von api/.
# Railway laedt beim Deploy den Stamm hoch; mit RAILWAY_DOCKERFILE_PATH=
# api/Dockerfile wird zwar diese Datei gebaut, der Kontext bleibt aber der
# Stamm. Relative Pfade wuerden hier die falsche package.json erwischen.
FROM node:22-alpine

WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev

COPY api/server.mjs ./

# Nicht als root laufen lassen.
USER node

EXPOSE 3000
CMD ["node", "server.mjs"]
