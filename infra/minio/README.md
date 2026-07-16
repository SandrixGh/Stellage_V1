# S3-хранилище контента коробок

Локально контент коробок лежит в **MinIO** (сервисы `minio` + `minio-init`
в docker-compose). Архитектура полностью provider-agnostic: переезд на
Selectel — только правка `backend/.env`, ни строчки кода.

## Как это устроено (одинаково локально и в проде)

- Бакет **приватный** (`mc anonymous set none`), любой прямой GET → 403.
- Запись: только presigned **POST** с policy-условиями — размер
  (`content-length-range`) и `Content-Type` зажаты на уровне хранилища.
- Чтение: только presigned **GET** на 300 секунд, выдаётся после серверной
  проверки правила видимости (владелец, либо public + распечатана + на
  публичной полке).
- Ключи объектов генерирует сервер: `users/{owner}/boxes/{instance}/{asset}.ext`.
  Ключи и presigned-ссылки не логируются и не сохраняются.
- Двухфазная загрузка: `initiate` → прямой POST в S3 → `complete`
  (head_object + сигнатура первых байтов против MIME-спуфинга).
- Удаление: статус `DELETING` → Celery-задача; часовой beat-sweeper добирает
  всё осиротевшее (объекты не «повисают» ни при каких сбоях).

## Локальная разработка (MinIO)

В `backend/.env`:

```
s3_endpoint_url=http://localhost:9000
s3_region=ru-1
s3_access_key_id=<логин, он же MINIO_ROOT_USER, мин. 3 символа>
s3_secret_access_key=<пароль, он же MINIO_ROOT_PASSWORD, мин. 8 символов>
s3_bucket_name=box-content-bucket
```

`docker compose --env-file backend/.env up -d` поднимет MinIO, создаст
приватный бакет и ограничит CORS фронтенд-origin'ом
(`MINIO_API_CORS_ALLOW_ORIGIN` на сервисе `minio`). Контейнеры backend/celery
ходят в MinIO как `http://minio:9000`, а presigned-ссылки подписываются под
`http://localhost:9000` (`s3_public_endpoint_url` в environment compose).
Консоль MinIO: http://localhost:9001.

## Переезд на Selectel (прод)

1. В панели Selectel создать **приватный** контейнер (тип «Private») в
   Object Storage и выпустить S3-ключи (сервисный пользователь с доступом
   только к этому контейнеру).
2. В `backend/.env` заменить:

   ```
   s3_endpoint_url=https://s3.ru-3.storage.selcloud.ru   # ОБЯЗАТЕЛЬНО со схемой https://
   s3_region=ru-3
   s3_access_key_id=<ключ Selectel>
   s3_secret_access_key=<секрет Selectel>
   s3_bucket_name=<имя контейнера>
   ```

   `s3_public_endpoint_url` НЕ задавать (или убрать из environment в
   docker-compose): в проде внутренний и браузерный endpoint совпадают.
3. Навесить CORS на контейнер (файл `infra/minio/cors.json`, поменяв
   `AllowedOrigins` на прод-домен фронтенда):

   ```
   aws s3api put-bucket-cors \
     --endpoint-url https://s3.ru-3.storage.selcloud.ru \
     --bucket <имя контейнера> \
     --cors-configuration file://infra/minio/cors.json
   ```
4. Всё. Presigning, приватность бакета, политика загрузки и sweeper работают
   без изменений — HTTPS даёт сам endpoint Selectel.

## Лимиты (backend/src/stellage/apps/boxes/assets/limits.py)

- Фото: jpeg/png/webp/gif, ≤ 10 МБ. Видео: mp4/webm, ≤ 200 МБ.
- ≤ 10 ассетов на коробку, квота 2 ГБ на пользователя.
- Rate limit: initiate 20/мин, complete 30/мин, get-asset-url 60/мин (по IP).
