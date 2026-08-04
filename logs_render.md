2026-08-04T12:40:50.554000402Z   File "/usr/local/lib/python3.13/site-packages/alembic/script/base.py", line 545, in run_env
2026-08-04T12:40:50.554004292Z     util.load_python_file(self.dir, "env.py")
2026-08-04T12:40:50.554008132Z     ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^
2026-08-04T12:40:50.554012683Z   File "/usr/local/lib/python3.13/site-packages/alembic/util/pyfiles.py", line 116, in load_python_file
2026-08-04T12:40:50.554016443Z     module = load_module_py(module_id, path)
2026-08-04T12:40:50.554024293Z   File "/usr/local/lib/python3.13/site-packages/alembic/util/pyfiles.py", line 136, in load_module_py
2026-08-04T12:40:50.554027503Z     spec.loader.exec_module(module)  # type: ignore
2026-08-04T12:40:50.554030343Z     ~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^
2026-08-04T12:40:50.554033383Z   File "<frozen importlib._bootstrap_external>", line 1023, in exec_module
2026-08-04T12:40:50.554052153Z   File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
2026-08-04T12:40:50.554056194Z   File "/app/src/stellage/database/alembic/env.py", line 9, in <module>
2026-08-04T12:40:50.554059534Z     from stellage.core.settings import settings
2026-08-04T12:40:50.554062904Z   File "/app/src/stellage/core/__init__.py", line 1, in <module>
2026-08-04T12:40:50.554066554Z     from .celery_config import celery_app
2026-08-04T12:40:50.554070334Z   File "/app/src/stellage/core/celery_config.py", line 3, in <module>
2026-08-04T12:40:50.554073414Z     from stellage.core.settings import settings
2026-08-04T12:40:50.554075794Z   File "/app/src/stellage/core/settings.py", line 80, in <module>
2026-08-04T12:40:50.554078224Z     class AppSettings(BaseAppSettings):
2026-08-04T12:40:50.554080574Z     ...<48 lines>...
2026-08-04T12:40:50.554082994Z             return self.environment == "production"
2026-08-04T12:40:50.554086754Z   File "/app/src/stellage/core/settings.py", line 85, in AppSettings
2026-08-04T12:40:50.554090694Z     email_settings: EmailSettings = EmailSettings()
2026-08-04T12:40:50.554106425Z                                     ~~~~~~~~~~~~~^^
2026-08-04T12:40:50.554110465Z   File "/usr/local/lib/python3.13/site-packages/pydantic_settings/main.py", line 194, in __init__
2026-08-04T12:40:50.554114635Z     super().__init__(
2026-08-04T12:40:50.554118175Z     ~~~~~~~~~~~~~~~~^
2026-08-04T12:40:50.554120725Z         **__pydantic_self__._settings_build_values(
2026-08-04T12:40:50.554125385Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T12:40:50.554128315Z     ...<27 lines>...
2026-08-04T12:40:50.554130795Z         )
2026-08-04T12:40:50.554133206Z         ^
2026-08-04T12:40:50.554135575Z     )
2026-08-04T12:40:50.554138036Z     ^
2026-08-04T12:40:50.554140656Z   File "/usr/local/lib/python3.13/site-packages/pydantic/main.py", line 250, in __init__
2026-08-04T12:40:50.554143296Z     validated_self = self.__pydantic_validator__.validate_python(data, self_instance=self)
2026-08-04T12:40:50.554145676Z pydantic_core._pydantic_core.ValidationError: 4 validation errors for EmailSettings
2026-08-04T12:40:50.554148136Z email_host
2026-08-04T12:40:50.554150526Z   Field required [type=missing, input_value={}, input_type=dict]
2026-08-04T12:40:50.554152976Z     For further information visit https://errors.pydantic.dev/2.12/v/missing
2026-08-04T12:40:50.554155496Z email_port
2026-08-04T12:40:50.554157976Z   Field required [type=missing, input_value={}, input_type=dict]
2026-08-04T12:40:50.554160436Z     For further information visit https://errors.pydantic.dev/2.12/v/missing
2026-08-04T12:40:50.554162826Z email_username
2026-08-04T12:40:50.554165256Z   Field required [type=missing, input_value={}, input_type=dict]
2026-08-04T12:40:50.554167676Z     For further information visit https://errors.pydantic.dev/2.12/v/missing
2026-08-04T12:40:50.554170066Z email_password
2026-08-04T12:40:50.554172436Z   Field required [type=missing, input_value={}, input_type=dict]
2026-08-04T12:40:50.554174856Z     For further information visit https://errors.pydantic.dev/2.12/v/missing
2026-08-04T12:40:52.943515771Z ==> Exited with status 1
2026-08-04T12:40:52.945757098Z ==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
2026-08-04T12:41:06.702668699Z Traceback (most recent call last):
2026-08-04T12:41:06.704470553Z   File "/usr/local/bin/alembic", line 8, in <module>
2026-08-04T12:41:06.704480183Z     sys.exit(main())
2026-08-04T12:41:06.704483683Z              ~~~~^^
2026-08-04T12:41:06.704487363Z   File "/usr/local/lib/python3.13/site-packages/alembic/config.py", line 1033, in main
2026-08-04T12:41:06.704491073Z     CommandLine(prog=prog).main(argv=argv)
2026-08-04T12:41:06.704493863Z     ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^
2026-08-04T12:41:06.704496733Z   File "/usr/local/lib/python3.13/site-packages/alembic/config.py", line 1023, in main
2026-08-04T12:41:06.704500314Z     self.run_cmd(cfg, options)
2026-08-04T12:41:06.704503574Z     ~~~~~~~~~~~~^^^^^^^^^^^^^^
2026-08-04T12:41:06.704506564Z   File "/usr/local/lib/python3.13/site-packages/alembic/config.py", line 957, in run_cmd
2026-08-04T12:41:06.704510764Z     fn(
2026-08-04T12:41:06.704512754Z     ~~^
2026-08-04T12:41:06.704514624Z         config,
2026-08-04T12:41:06.704516484Z         ^^^^^^^
2026-08-04T12:41:06.704518514Z         *[getattr(options, k, None) for k in positional],
2026-08-04T12:41:06.704520434Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T12:41:06.704522344Z         **{k: getattr(options, k, None) for k in kwarg},
2026-08-04T12:41:06.704524264Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T12:41:06.704526154Z     )
2026-08-04T12:41:06.704529554Z     ^
2026-08-04T12:41:06.704533044Z   File "/usr/local/lib/python3.13/site-packages/alembic/command.py", line 483, in upgrade
2026-08-04T12:41:06.704536044Z     script.run_env()
2026-08-04T12:41:06.704538934Z     ~~~~~~~~~~~~~~^^
2026-08-04T12:41:06.704541704Z   File "/usr/local/lib/python3.13/site-packages/alembic/script/base.py", line 545, in run_env
2026-08-04T12:41:06.704544684Z     util.load_python_file(self.dir, "env.py")
2026-08-04T12:41:06.704547815Z     ~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^
2026-08-04T12:41:06.704566725Z   File "/usr/local/lib/python3.13/site-packages/alembic/util/pyfiles.py", line 116, in load_python_file
2026-08-04T12:41:06.704573375Z     module = load_module_py(module_id, path)
2026-08-04T12:41:06.704576355Z   File "/usr/local/lib/python3.13/site-packages/alembic/util/pyfiles.py", line 136, in load_module_py
2026-08-04T12:41:06.704579435Z     spec.loader.exec_module(module)  # type: ignore
2026-08-04T12:41:06.704581925Z     ~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^
2026-08-04T12:41:06.704585136Z   File "<frozen importlib._bootstrap_external>", line 1023, in exec_module
2026-08-04T12:41:06.704587656Z   File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
2026-08-04T12:41:06.704590186Z   File "/app/src/stellage/database/alembic/env.py", line 9, in <module>
2026-08-04T12:41:06.704592716Z     from stellage.core.settings import settings
2026-08-04T12:41:06.704595426Z   File "/app/src/stellage/core/__init__.py", line 1, in <module>
2026-08-04T12:41:06.704598406Z     from .celery_config import celery_app
2026-08-04T12:41:06.704600986Z   File "/app/src/stellage/core/celery_config.py", line 3, in <module>
2026-08-04T12:41:06.704603906Z     from stellage.core.settings import settings
2026-08-04T12:41:06.704606556Z   File "/app/src/stellage/core/settings.py", line 80, in <module>
2026-08-04T12:41:06.704609236Z     class AppSettings(BaseAppSettings):
2026-08-04T12:41:06.704611776Z     ...<48 lines>...
2026-08-04T12:41:06.704614716Z             return self.environment == "production"
2026-08-04T12:41:06.704629086Z   File "/app/src/stellage/core/settings.py", line 85, in AppSettings
2026-08-04T12:41:06.704632277Z     email_settings: EmailSettings = EmailSettings()
2026-08-04T12:41:06.704642777Z                                     ~~~~~~~~~~~~~^^
2026-08-04T12:41:06.704645877Z   File "/usr/local/lib/python3.13/site-packages/pydantic_settings/main.py", line 194, in __init__
2026-08-04T12:41:06.704649087Z     super().__init__(
2026-08-04T12:41:06.704651887Z     ~~~~~~~~~~~~~~~~^
2026-08-04T12:41:06.704654937Z         **__pydantic_self__._settings_build_values(
2026-08-04T12:41:06.704657497Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-08-04T12:41:06.704660007Z     ...<27 lines>...
2026-08-04T12:41:06.704662867Z         )
2026-08-04T12:41:06.704665747Z         ^
2026-08-04T12:41:06.704668347Z     )
2026-08-04T12:41:06.704670958Z     ^
2026-08-04T12:41:06.704673688Z   File "/usr/local/lib/python3.13/site-packages/pydantic/main.py", line 250, in __init__
2026-08-04T12:41:06.704676448Z     validated_self = self.__pydantic_validator__.validate_python(data, self_instance=self)
2026-08-04T12:41:06.704688768Z pydantic_core._pydantic_core.ValidationError: 4 validation errors for EmailSettings
2026-08-04T12:41:06.704691848Z email_host
2026-08-04T12:41:06.704694868Z   Field required [type=missing, input_value={}, input_type=dict]
2026-08-04T12:41:06.704697608Z     For further information visit https://errors.pydantic.dev/2.12/v/missing
2026-08-04T12:41:06.704699508Z email_port
2026-08-04T12:41:06.704701408Z   Field required [type=missing, input_value={}, input_type=dict]
2026-08-04T12:41:06.704703368Z     For further information visit https://errors.pydantic.dev/2.12/v/missing
2026-08-04T12:41:06.704705268Z email_username
2026-08-04T12:41:06.704707139Z   Field required [type=missing, input_value={}, input_type=dict]
2026-08-04T12:41:06.704709068Z     For further information visit https://errors.pydantic.dev/2.12/v/missing
2026-08-04T12:41:06.704710928Z email_password
2026-08-04T12:41:06.704712799Z   Field required [type=missing, input_value={}, input_type=dict]
2026-08-04T12:41:06.704714709Z     For further information visit https://errors.pydantic.dev/2.12/v/missing