FROM node:18-slim
WORKDIR /app
RUN apt-get update \
    && apt-get install -y postgresql-client jq curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend.js ./
COPY frontend ./frontend
COPY data ./data
COPY fetch_wiki_coords.sh ./
RUN chmod +x fetch_wiki_coords.sh \
    && for m in Aberration CrystalIsles Extinction Fjordur Genesis1 Genesis2 \
       Ragnarok ScorchedEarth TheCenter TheIsland Valguero; do \
         ./fetch_wiki_coords.sh "$m" --update || true; \
       done

RUN npm install express pg

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
