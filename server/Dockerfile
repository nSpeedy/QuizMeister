FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-slim
ENV NODE_ENV=production \
    PORT=8080 \
    DB_PATH=/data/quiz.db
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY app.ts ./
COPY lib ./lib
COPY middleware ./middleware
COPY models ./models
COPY repo ./repo
COPY routes ./routes
COPY ws ./ws
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/v1/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "app.ts"]
