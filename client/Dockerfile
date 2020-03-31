FROM node:alpine as builder

WORKDIR '/app'

COPY package.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx

EXPOSE 3000
# copy our nginx default.conf over the default one in
# the nginx congtainer
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
# look back into our builder step, grab the build directory
# copy it into /usr/share/nginx/html in the nginx container
COPY --from=builder /app/build /usr/share/nginx/html
