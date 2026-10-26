# Plain static site (no build step). Copying specific files rather than `COPY . .` so nginx.conf (needed in the
# build context for the COPY below) doesn't also end up served as a static asset alongside the real site files.
FROM nginx:alpine

COPY *.html *.js *.css *.jpeg /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
