FROM python:3.12-slim

WORKDIR /app
COPY pyproject.toml README.md /app/
COPY phishintel /app/phishintel

RUN pip install --no-cache-dir .

ENV HOST=0.0.0.0 PORT=8080
EXPOSE 8080

CMD ["phishintel", "serve"]
