"""
WSGI config for ev_sga_t project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.8/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application  # pylint: disable=import-error

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ev_sga.test_settings")

application = get_wsgi_application()  # pylint: disable=invalid-name
