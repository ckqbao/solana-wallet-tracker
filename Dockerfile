FROM node:18-alpine as builder

USER node
WORKDIR /home/node

COPY . /home/node

RUN npm ci --force

ENV NODE_ENV production

RUN npm run build

FROM node:18-alpine As production

ENV NODE_ENV production

WORKDIR /app

# Copy the bundled code from the build stage to the production image
COPY --from=builder /home/node/node_modules /app/node_modules
COPY --from=builder /home/node/dist /app/dist

CMD ["node", "dist/main.js"]