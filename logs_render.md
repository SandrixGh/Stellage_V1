2026-08-04T17:24:46.314050577Z #10 2.079   - Installing uvloop (0.22.1)
2026-08-04T17:24:46.314051697Z #10 2.092   - Installing vine (5.1.0)
2026-08-04T17:24:46.424844058Z #10 2.102   - Installing watchfiles (1.2.0)
2026-08-04T17:24:46.424852087Z #10 2.154   - Installing wcwidth (0.2.14)
2026-08-04T17:24:46.424853075Z #10 2.179   - Installing websockets (15.0.1)
2026-08-04T17:24:46.424853918Z #10 2.203   - Installing wrapt (1.17.3)
2026-08-04T17:24:46.595304013Z #10 2.223   - Installing yarl (1.24.2)
2026-08-04T17:24:48.541871244Z #10 DONE 4.3s
2026-08-04T17:24:48.758080033Z 
2026-08-04T17:24:48.758134043Z #11 [6/8] COPY alembic.ini ./
2026-08-04T17:24:48.758138637Z #11 DONE 0.0s
2026-08-04T17:24:48.758139505Z 
2026-08-04T17:24:48.758141829Z #12 [7/8] COPY templates/ ./templates/
2026-08-04T17:24:48.758142716Z #12 DONE 0.0s
2026-08-04T17:24:48.758143462Z 
2026-08-04T17:24:48.758144267Z #13 [8/8] COPY src/ ./src/
2026-08-04T17:24:48.758145078Z #13 DONE 0.0s
2026-08-04T17:24:48.758145816Z 
2026-08-04T17:24:48.758147719Z #14 exporting to image
2026-08-04T17:24:48.758148638Z #14 exporting layers
2026-08-04T17:24:49.543659316Z #14 exporting layers 0.9s done
2026-08-04T17:24:49.769253084Z #14 pushing layers
2026-08-04T17:24:53.506992922Z #14 pushing layers 4.0s done
2026-08-04T17:24:53.624937514Z #14 DONE 5.0s
2026-08-04T17:24:53.624960632Z 
2026-08-04T17:24:53.624963087Z #15 exporting cache to registry
2026-08-04T17:24:53.624964668Z #15 sending cache export
2026-08-04T17:24:54.266787828Z #15 sending cache export 4.7s done
2026-08-04T17:24:54.266832706Z #15 DONE 4.7s
2026-08-04T17:24:56.000197984Z ==> Deploying...
2026-08-04T17:24:56.183947824Z ==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
2026-08-04T17:25:35.391722644Z INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
2026-08-04T17:25:35.391776325Z INFO  [alembic.runtime.migration] Will assume transactional DDL.
2026-08-04T17:25:57.270374628Z INFO:     Started server process [28]
2026-08-04T17:25:57.270409688Z INFO:     Waiting for application startup.
2026-08-04T17:25:57.270739395Z INFO:     Application startup complete.
2026-08-04T17:25:57.271861996Z INFO:     Uvicorn running on http://0.0.0.0:10000 (Press CTRL+C to quit)
2026-08-04T17:25:58.682731358Z ==> No open ports detected, continuing to scan...
2026-08-04T17:25:59.054500022Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2026-08-04T17:26:07.101596229Z ==> Your service is live 🎉
2026-08-04T17:26:07.312903249Z ==> 
2026-08-04T17:26:07.316583833Z ==> ///////////////////////////////////////////////////////////
2026-08-04T17:26:07.319180099Z ==> 
2026-08-04T17:26:07.321719294Z ==> Available at your primary URL https://api.stellage.tech + 1 more domain
2026-08-04T17:26:07.324225667Z ==> 
2026-08-04T17:26:07.326355032Z ==> ///////////////////////////////////////////////////////////
2026-08-04T17:26:18.793056136Z INFO:     144.31.3.73:0 - "WebSocket /api.v1/messages/ws" [accepted]
2026-08-04T17:26:18.793648618Z INFO:     connection open
2026-08-04T17:26:39.175417694Z INFO:     89.106.88.3:0 - "WebSocket /api.v1/messages/ws" [accepted]
2026-08-04T17:26:39.280174715Z INFO:     connection open