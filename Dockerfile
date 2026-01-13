FROM node:20-alpine

# Installer les dépendances système pour compiler bcrypt et Prisma
RUN apk add --no-cache python3 make g++ openssl-dev openssl

WORKDIR /app

# Copier les fichiers package
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le reste de l'application
COPY . .

# Générer le client Prisma
RUN npx prisma generate

EXPOSE 5001

CMD ["node", "src/server.js"]
