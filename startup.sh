cd /home/site/wwwroot
export NODE_ENV=production
export PORT=8080
export DISABLE_HMR=true

echo "--- STARTUP DIAGNOSTICS ---"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

if [ ! -d "node_modules/express" ]; then
  echo "Dependencies not found or incomplete. Installing..."
  npm install --omit=dev
fi

echo "--- STARTING SERVER ---"
node server.js

