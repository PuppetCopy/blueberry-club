# Production image, copy all the files and run next
FROM node:16-alpine
WORKDIR /app

RUN apk add --update \
  curl \
  && rm -rf /var/cache/apk/*

ENV NODE_ENV production



# RUN addgroup --system --gid 1001 nodejs


ARG PACKAGE_PATH


# Bundle app source
COPY ./ /app

RUN yarn build

EXPOSE 3000
ENV PORT 3000

CMD yarn start
