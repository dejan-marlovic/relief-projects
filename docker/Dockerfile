# -----------------------
# Build stage (CRA build)
# -----------------------
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

RUN npm run build

# -----------------------
# Runtime stage (nginx)
# -----------------------
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

# ✅ Put your config in nginx template folder so envsubst runs automatically
# We keep your repo filename docker/nginx.conf, but copy it as a template inside the image.
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template

# ✅ Default for local docker-compose (service name "app")
# (no trailing slash!)
ENV API_PROXY_PASS=http://app:8080

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
