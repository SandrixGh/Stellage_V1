2026-08-04T19:04:31.992992175Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 797, in _handle_exception
2026-08-04T19:04:31.992994165Z     raise translated_error from error
2026-08-04T19:04:31.992996146Z sqlalchemy.exc.DBAPIError: (sqlalchemy.dialects.postgresql.asyncpg.Error) <class 'asyncpg.exceptions.InvalidTextRepresentationError'>: invalid input value for enum currencyenum: "STELLA"
2026-08-04T19:04:31.993000255Z [SQL: INSERT INTO box_templates (title, description, price, currency, rarity, creator_id, id, created_at) VALUES ($1::VARCHAR, $2::VARCHAR, $3::NUMERIC(10, 2), $4::currencyenum, $5::boxrarity, $6::UUID, $7::UUID, $8::TIMESTAMP WITH TIME ZONE) RETURNING box_templates.title, box_templates.description, box_templates.price, box_templates.currency, box_templates.rarity, box_templates.creator_id, box_templates.id, box_templates.created_at, box_templates.updated_at]
2026-08-04T19:04:31.993005016Z [parameters: ('Stellage First Box', 'Stellage First Box', Decimal('0'), 'STELLA', 'DEV', UUID('b0059daa-2bb1-4dbc-9ab1-fdef60efea7c'), UUID('7ed9f44a-5ad1-4e70-a6b7-4e599974a891'), datetime.datetime(2026, 8, 4, 19, 4, 31, 812324))]
2026-08-04T19:04:31.993006956Z (Background on this error at: https://sqlalche.me/e/20/dbapi)
2026-08-04T19:04:36.192571168Z INFO:     2a0e:d600:0:43c::2:0 - "WebSocket /api.v1/messages/ws" [accepted]
2026-08-04T19:04:36.193119909Z INFO:     connection open
2026-08-04T19:04:51.598183266Z INFO:     2a0e:d600:0:43c::2:0 - "WebSocket /api.v1/messages/ws" [accepted]
2026-08-04T19:04:51.598640805Z INFO:     connection open
2026-08-04T19:04:55.495223271Z ERROR:    Exception in ASGI application
2026-08-04T19:04:55.495265162Z Traceback (most recent call last):
2026-08-04T19:04:55.495271942Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 550, in _prepare_and_execute
2026-08-04T19:04:55.495277362Z     self._rows = deque(await prepared_stmt.fetch(*parameters))
2026-08-04T19:04:55.495282382Z                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495288022Z   File "/usr/local/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 177, in fetch
2026-08-04T19:04:55.495292672Z     data = await self.__bind_execute(args, 0, timeout)
2026-08-04T19:04:55.495297143Z            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495319963Z   File "/usr/local/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 268, in __bind_execute
2026-08-04T19:04:55.495323913Z     data, status, _ = await self.__do_execute(
2026-08-04T19:04:55.495326803Z                       ^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495329573Z         lambda protocol: protocol.bind_execute(
2026-08-04T19:04:55.495332663Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495335783Z             self._state, args, '', limit, True, timeout))
2026-08-04T19:04:55.495338423Z             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495341053Z   File "/usr/local/lib/python3.13/site-packages/asyncpg/prepared_stmt.py", line 257, in __do_execute
2026-08-04T19:04:55.495344033Z     return await executor(protocol)
2026-08-04T19:04:55.495347064Z            ^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495350984Z   File "asyncpg/protocol/protocol.pyx", line 205, in bind_execute
2026-08-04T19:04:55.495354024Z asyncpg.exceptions.InvalidTextRepresentationError: invalid input value for enum currencyenum: "STELLA"
2026-08-04T19:04:55.495356844Z 
2026-08-04T19:04:55.495360014Z The above exception was the direct cause of the following exception:
2026-08-04T19:04:55.495362594Z 
2026-08-04T19:04:55.495365324Z Traceback (most recent call last):
2026-08-04T19:04:55.495368034Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
2026-08-04T19:04:55.495371254Z     self.dialect.do_execute(
2026-08-04T19:04:55.495373954Z     ~~~~~~~~~~~~~~~~~~~~~~~^
2026-08-04T19:04:55.495376764Z         cursor, str_statement, effective_parameters, context
2026-08-04T19:04:55.495379314Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495381994Z     )
2026-08-04T19:04:55.495384704Z     ^
2026-08-04T19:04:55.495387544Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/engine/default.py", line 952, in do_execute
2026-08-04T19:04:55.495390624Z     cursor.execute(statement, parameters)
2026-08-04T19:04:55.495393794Z     ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495397065Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 585, in execute
2026-08-04T19:04:55.495400074Z     self._adapt_connection.await_(
2026-08-04T19:04:55.495402955Z     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
2026-08-04T19:04:55.495406135Z         self._prepare_and_execute(operation, parameters)
2026-08-04T19:04:55.495409005Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495411725Z     )
2026-08-04T19:04:55.495414625Z     ^
2026-08-04T19:04:55.495417565Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 132, in await_only
2026-08-04T19:04:55.495420405Z     return current.parent.switch(awaitable)  # type: ignore[no-any-return,attr-defined] # noqa: E501
2026-08-04T19:04:55.495423435Z            ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
2026-08-04T19:04:55.495426465Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 196, in greenlet_spawn
2026-08-04T19:04:55.495430255Z     value = await result
2026-08-04T19:04:55.495433145Z             ^^^^^^^^^^^^
2026-08-04T19:04:55.495435965Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 563, in _prepare_and_execute
2026-08-04T19:04:55.495438835Z     self._handle_exception(error)
2026-08-04T19:04:55.495441625Z     ~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
2026-08-04T19:04:55.495444446Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 513, in _handle_exception
2026-08-04T19:04:55.495454256Z     self._adapt_connection._handle_exception(error)
2026-08-04T19:04:55.495461016Z     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
2026-08-04T19:04:55.495463906Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 797, in _handle_exception
2026-08-04T19:04:55.495466676Z     raise translated_error from error
2026-08-04T19:04:55.495470136Z sqlalchemy.dialects.postgresql.asyncpg.AsyncAdapt_asyncpg_dbapi.Error: <class 'asyncpg.exceptions.InvalidTextRepresentationError'>: invalid input value for enum currencyenum: "STELLA"
2026-08-04T19:04:55.495472846Z 
2026-08-04T19:04:55.495475936Z The above exception was the direct cause of the following exception:
2026-08-04T19:04:55.495478466Z 
2026-08-04T19:04:55.495480956Z Traceback (most recent call last):
2026-08-04T19:04:55.495483906Z   File "/usr/local/lib/python3.13/site-packages/uvicorn/protocols/http/httptools_impl.py", line 416, in run_asgi
2026-08-04T19:04:55.495486726Z     result = await app(  # type: ignore[func-returns-value]
2026-08-04T19:04:55.495489656Z              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495492376Z         self.scope, self.receive, self.send
2026-08-04T19:04:55.495494927Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495497667Z     )
2026-08-04T19:04:55.495500547Z     ^
2026-08-04T19:04:55.495503257Z   File "/usr/local/lib/python3.13/site-packages/uvicorn/middleware/proxy_headers.py", line 60, in __call__
2026-08-04T19:04:55.495505877Z     return await self.app(scope, receive, send)
2026-08-04T19:04:55.495511487Z            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495534317Z   File "/usr/local/lib/python3.13/site-packages/fastapi/applications.py", line 1135, in __call__
2026-08-04T19:04:55.495539067Z     await super().__call__(scope, receive, send)
2026-08-04T19:04:55.495542017Z   File "/usr/local/lib/python3.13/site-packages/starlette/applications.py", line 107, in __call__
2026-08-04T19:04:55.495545157Z     await self.middleware_stack(scope, receive, send)
2026-08-04T19:04:55.495548068Z   File "/usr/local/lib/python3.13/site-packages/starlette/middleware/errors.py", line 186, in __call__
2026-08-04T19:04:55.495550777Z     raise exc
2026-08-04T19:04:55.495553558Z   File "/usr/local/lib/python3.13/site-packages/starlette/middleware/errors.py", line 164, in __call__
2026-08-04T19:04:55.495556608Z     await self.app(scope, receive, _send)
2026-08-04T19:04:55.495559388Z   File "/usr/local/lib/python3.13/site-packages/starlette/middleware/cors.py", line 93, in __call__
2026-08-04T19:04:55.495562608Z     await self.simple_response(scope, receive, send, request_headers=headers)
2026-08-04T19:04:55.495565378Z   File "/usr/local/lib/python3.13/site-packages/starlette/middleware/cors.py", line 144, in simple_response
2026-08-04T19:04:55.495568008Z     await self.app(scope, receive, send)
2026-08-04T19:04:55.495570848Z   File "/usr/local/lib/python3.13/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
2026-08-04T19:04:55.495573678Z     await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
2026-08-04T19:04:55.495576378Z   File "/usr/local/lib/python3.13/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
2026-08-04T19:04:55.495578908Z     raise exc
2026-08-04T19:04:55.495581598Z   File "/usr/local/lib/python3.13/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
2026-08-04T19:04:55.495584438Z     await app(scope, receive, sender)
2026-08-04T19:04:55.495586978Z   File "/usr/local/lib/python3.13/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
2026-08-04T19:04:55.495601169Z     await self.app(scope, receive, send)
2026-08-04T19:04:55.495604609Z   File "/usr/local/lib/python3.13/site-packages/starlette/routing.py", line 716, in __call__
2026-08-04T19:04:55.495607459Z     await self.middleware_stack(scope, receive, send)
2026-08-04T19:04:55.495610389Z   File "/usr/local/lib/python3.13/site-packages/starlette/routing.py", line 736, in app
2026-08-04T19:04:55.495613389Z     await route.handle(scope, receive, send)
2026-08-04T19:04:55.495615679Z   File "/usr/local/lib/python3.13/site-packages/starlette/routing.py", line 290, in handle
2026-08-04T19:04:55.495617579Z     await self.app(scope, receive, send)
2026-08-04T19:04:55.495619509Z   File "/usr/local/lib/python3.13/site-packages/fastapi/routing.py", line 115, in app
2026-08-04T19:04:55.495621349Z     await wrap_app_handling_exceptions(app, request)(scope, receive, send)
2026-08-04T19:04:55.495623229Z   File "/usr/local/lib/python3.13/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
2026-08-04T19:04:55.495625119Z     raise exc
2026-08-04T19:04:55.495627039Z   File "/usr/local/lib/python3.13/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
2026-08-04T19:04:55.495628939Z     await app(scope, receive, sender)
2026-08-04T19:04:55.495630889Z   File "/usr/local/lib/python3.13/site-packages/fastapi/routing.py", line 101, in app
2026-08-04T19:04:55.495632869Z     response = await f(request)
2026-08-04T19:04:55.495634749Z                ^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495636629Z   File "/usr/local/lib/python3.13/site-packages/fastapi/routing.py", line 355, in app
2026-08-04T19:04:55.495638519Z     raw_response = await run_endpoint_function(
2026-08-04T19:04:55.495640409Z                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.49564233Z     ...<3 lines>...
2026-08-04T19:04:55.495644299Z     )
2026-08-04T19:04:55.495646179Z     ^
2026-08-04T19:04:55.495648039Z   File "/usr/local/lib/python3.13/site-packages/fastapi/routing.py", line 243, in run_endpoint_function
2026-08-04T19:04:55.495649959Z     return await dependant.call(**values)
2026-08-04T19:04:55.49565184Z            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.49565378Z   File "/app/src/stellage/apps/boxes/routes.py", line 181, in create_box
2026-08-04T19:04:55.49565565Z     template = await template_service.create_template(
2026-08-04T19:04:55.4956576Z                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.49565954Z     ...<8 lines>...
2026-08-04T19:04:55.49566143Z     )
2026-08-04T19:04:55.49568664Z     ^
2026-08-04T19:04:55.495696691Z   File "/app/src/stellage/apps/boxes/templates/services.py", line 33, in create_template
2026-08-04T19:04:55.49569956Z     return await self.manager.create_template(
2026-08-04T19:04:55.495702281Z            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495705051Z     ...<2 lines>...
2026-08-04T19:04:55.495707671Z     )
2026-08-04T19:04:55.495710461Z     ^
2026-08-04T19:04:55.495713381Z   File "/app/src/stellage/apps/boxes/templates/managers.py", line 31, in create_template
2026-08-04T19:04:55.495716421Z     return await self.repository.create_template(
2026-08-04T19:04:55.495719191Z            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495721971Z     ...<2 lines>...
2026-08-04T19:04:55.495724811Z     )
2026-08-04T19:04:55.495727611Z     ^
2026-08-04T19:04:55.495730411Z   File "/app/src/stellage/apps/boxes/templates/repositories.py", line 78, in create_template
2026-08-04T19:04:55.495732951Z     raise e
2026-08-04T19:04:55.495735341Z   File "/app/src/stellage/apps/boxes/templates/repositories.py", line 64, in create_template
2026-08-04T19:04:55.495744552Z     result = await session.execute(query)
2026-08-04T19:04:55.495747592Z              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495750521Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/ext/asyncio/session.py", line 449, in execute
2026-08-04T19:04:55.495753552Z     result = await greenlet_spawn(
2026-08-04T19:04:55.495756412Z              ^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495768192Z     ...<6 lines>...
2026-08-04T19:04:55.495771122Z     )
2026-08-04T19:04:55.495774352Z     ^
2026-08-04T19:04:55.495788352Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 201, in greenlet_spawn
2026-08-04T19:04:55.495791272Z     result = context.throw(*sys.exc_info())
2026-08-04T19:04:55.495794613Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/orm/session.py", line 2351, in execute
2026-08-04T19:04:55.495801122Z     return self._execute_internal(
2026-08-04T19:04:55.495804253Z            ~~~~~~~~~~~~~~~~~~~~~~^
2026-08-04T19:04:55.495807283Z         statement,
2026-08-04T19:04:55.495810003Z         ^^^^^^^^^^
2026-08-04T19:04:55.495812843Z     ...<4 lines>...
2026-08-04T19:04:55.495816073Z         _add_event=_add_event,
2026-08-04T19:04:55.495818993Z         ^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495821883Z     )
2026-08-04T19:04:55.495824493Z     ^
2026-08-04T19:04:55.495827163Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/orm/session.py", line 2249, in _execute_internal
2026-08-04T19:04:55.495830233Z     result: Result[Any] = compile_state_cls.orm_execute_statement(
2026-08-04T19:04:55.495833643Z                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
2026-08-04T19:04:55.495836833Z         self,
2026-08-04T19:04:55.495840093Z         ^^^^^
2026-08-04T19:04:55.495843083Z     ...<4 lines>...
2026-08-04T19:04:55.495846203Z         conn,
2026-08-04T19:04:55.495849134Z         ^^^^^
2026-08-04T19:04:55.495851814Z     )
2026-08-04T19:04:55.495854584Z     ^
2026-08-04T19:04:55.495857834Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/orm/bulk_persistence.py", line 1306, in orm_execute_statement
2026-08-04T19:04:55.495860844Z     result = conn.execute(
2026-08-04T19:04:55.495862834Z         statement, params or {}, execution_options=execution_options
2026-08-04T19:04:55.495864744Z     )
2026-08-04T19:04:55.495866974Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1419, in execute
2026-08-04T19:04:55.495868904Z     return meth(
2026-08-04T19:04:55.495870874Z         self,
2026-08-04T19:04:55.495872764Z         distilled_parameters,
2026-08-04T19:04:55.495874694Z         execution_options or NO_OPTIONS,
2026-08-04T19:04:55.495876594Z     )
2026-08-04T19:04:55.495878474Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/sql/elements.py", line 527, in _execute_on_connection
2026-08-04T19:04:55.495881054Z     return connection._execute_clauseelement(
2026-08-04T19:04:55.495884184Z            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
2026-08-04T19:04:55.495887384Z         self, distilled_params, execution_options
2026-08-04T19:04:55.495890214Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495893355Z     )
2026-08-04T19:04:55.495896064Z     ^
2026-08-04T19:04:55.495898524Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1641, in _execute_clauseelement
2026-08-04T19:04:55.495901044Z     ret = self._execute_context(
2026-08-04T19:04:55.495903455Z         dialect,
2026-08-04T19:04:55.495905735Z     ...<8 lines>...
2026-08-04T19:04:55.495907995Z         cache_hit=cache_hit,
2026-08-04T19:04:55.495916585Z     )
2026-08-04T19:04:55.495919455Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1846, in _execute_context
2026-08-04T19:04:55.495922195Z     return self._exec_single_context(
2026-08-04T19:04:55.495924975Z            ~~~~~~~~~~~~~~~~~~~~~~~~~^
2026-08-04T19:04:55.495928075Z         dialect, context, statement, parameters
2026-08-04T19:04:55.495930955Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495933925Z     )
2026-08-04T19:04:55.495936905Z     ^
2026-08-04T19:04:55.495939935Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1986, in _exec_single_context
2026-08-04T19:04:55.495942716Z     self._handle_dbapi_exception(
2026-08-04T19:04:55.495945396Z     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
2026-08-04T19:04:55.495948785Z         e, str_statement, effective_parameters, cursor, context
2026-08-04T19:04:55.495952056Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495953966Z     )
2026-08-04T19:04:55.495955836Z     ^
2026-08-04T19:04:55.495957786Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 2363, in _handle_dbapi_exception
2026-08-04T19:04:55.495959796Z     raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
2026-08-04T19:04:55.495961766Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/engine/base.py", line 1967, in _exec_single_context
2026-08-04T19:04:55.495963646Z     self.dialect.do_execute(
2026-08-04T19:04:55.495965536Z     ~~~~~~~~~~~~~~~~~~~~~~~^
2026-08-04T19:04:55.495967486Z         cursor, str_statement, effective_parameters, context
2026-08-04T19:04:55.495969356Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495971236Z     )
2026-08-04T19:04:55.495973886Z     ^
2026-08-04T19:04:55.495975816Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/engine/default.py", line 952, in do_execute
2026-08-04T19:04:55.495977666Z     cursor.execute(statement, parameters)
2026-08-04T19:04:55.495979526Z     ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495981406Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 585, in execute
2026-08-04T19:04:55.495983276Z     self._adapt_connection.await_(
2026-08-04T19:04:55.495985176Z     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^
2026-08-04T19:04:55.495987106Z         self._prepare_and_execute(operation, parameters)
2026-08-04T19:04:55.495988946Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T19:04:55.495990896Z     )
2026-08-04T19:04:55.495992776Z     ^
2026-08-04T19:04:55.495994626Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 132, in await_only
2026-08-04T19:04:55.495996497Z     return current.parent.switch(awaitable)  # type: ignore[no-any-return,attr-defined] # noqa: E501
2026-08-04T19:04:55.495998406Z            ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
2026-08-04T19:04:55.496000337Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/util/_concurrency_py3k.py", line 196, in greenlet_spawn
2026-08-04T19:04:55.496002217Z     value = await result
2026-08-04T19:04:55.496004077Z             ^^^^^^^^^^^^
2026-08-04T19:04:55.496005977Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 563, in _prepare_and_execute
2026-08-04T19:04:55.496008507Z     self._handle_exception(error)
2026-08-04T19:04:55.496024087Z     ~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
2026-08-04T19:04:55.496027157Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 513, in _handle_exception
2026-08-04T19:04:55.496049198Z     self._adapt_connection._handle_exception(error)
2026-08-04T19:04:55.496053238Z     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^
2026-08-04T19:04:55.496055868Z   File "/usr/local/lib/python3.13/site-packages/sqlalchemy/dialects/postgresql/asyncpg.py", line 797, in _handle_exception
2026-08-04T19:04:55.496057838Z     raise translated_error from error
2026-08-04T19:04:55.496059888Z sqlalchemy.exc.DBAPIError: (sqlalchemy.dialects.postgresql.asyncpg.Error) <class 'asyncpg.exceptions.InvalidTextRepresentationError'>: invalid input value for enum currencyenum: "STELLA"
2026-08-04T19:04:55.496062488Z [SQL: INSERT INTO box_templates (title, description, price, currency, rarity, creator_id, id, created_at) VALUES ($1::VARCHAR, $2::VARCHAR, $3::NUMERIC(10, 2), $4::currencyenum, $5::boxrarity, $6::UUID, $7::UUID, $8::TIMESTAMP WITH TIME ZONE) RETURNING box_templates.title, box_templates.description, box_templates.price, box_templates.currency, box_templates.rarity, box_templates.creator_id, box_templates.id, box_templates.created_at, box_templates.updated_at]
2026-08-04T19:04:55.496065148Z [parameters: ('Stellage First Box', 'Stellage First Box', Decimal('0'), 'STELLA', 'DEV', UUID('b0059daa-2bb1-4dbc-9ab1-fdef60efea7c'), UUID('1a5d86e9-5e34-4bca-abc6-0b114ab54602'), datetime.datetime(2026, 8, 4, 19, 4, 55, 431000))]
2026-08-04T19:04:55.496067068Z (Background on this error at: https://sqlalche.me/e/20/dbapi)
2026-08-04T19:05:01.058510197Z INFO:     connection closed