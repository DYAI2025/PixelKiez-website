# Formular-Gegenstelle. Eigener Railway-Dienst, getrennt von der Website:
# faellt er aus, bleibt die Seite erreichbar und das Formular weicht auf den
# E-Mail-Pfad aus.
FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.mjs ./

# Nicht als root laufen lassen.
USER node

EXPOSE 3000
CMD ["node", "server.mjs"]
