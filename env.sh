#!/bin/sh

# Copyright (C) 2026 Yukthi Systems Private Limited
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License version 3
# as published by the Free Software Foundation.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# version 3 along with this program. If not, see
# <https://www.gnu.org/licenses/>.


# Line below ensures we can write to the directory
cd /app

# Recreate the config file
rm -rf ./dist/env-config.js
touch ./dist/env-config.js

# Add assignment
echo "window._env_ = {" >> ./dist/env-config.js

# Read specific variables. Add any others you need here.
# We use default values (:-"") to prevent errors if missing.
echo "  VITE_API_URL: \"${VITE_API_URL:-https://webmail-api.test.yukthi.net}\"," >> ./dist/env-config.js
echo "  VITE_DNS_API_KEY: \"${VITE_DNS_API_KEY}\"," >> ./dist/env-config.js
echo "  VITE_APP_VERSION: \"${VITE_APP_VERSION}\"," >> ./dist/env-config.js
echo "  VITE_RECAPTCHA_KEY: \"${VITE_RECAPTCHA_KEY}\"," >> ./dist/env-config.js
echo "  VITE_DNS_API_URL: \"${VITE_DNS_API_URL}\"," >> ./dist/env-config.js

echo "}" >> ./dist/env-config.js

# Execute the passed command (starts the server)
exec "$@"