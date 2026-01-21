#Dockerfile frontend
# -----------------------
# Build stage (CRA build)
# -----------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests first for better Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the app
COPY . .

# Build-time API base URL (CRA bakes REACT_APP_* vars into the build)
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Build the static production bundle
RUN npm run build

# -----------------------
# Runtime stage (nginx)
# -----------------------
FROM nginx:alpine

# Copy built static files into nginx
COPY --from=build /app/build /usr/share/nginx/html

# ✅ add this
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
