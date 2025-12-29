#!/bin/bash

# Quick setup script for pubmed.algovesh.com
# Run this on your EC2 instance

set -e

DOMAIN="pubmed.algovesh.com"
PROJECT_DIR="$HOME/pubmed-helper"

echo "🚀 Setting up $DOMAIN..."

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found at $PROJECT_DIR"
    echo "Please clone or upload your project first"
    exit 1
fi

# Backend setup
echo "📦 Setting up backend..."
cd "$PROJECT_DIR/backend"

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://$DOMAIN
EOF
    echo "⚠️  Please update backend/.env with your OpenAI API key!"
fi

npm install --production
npm run build

# Start with PM2
if pm2 list | grep -q "pubmed-helper-backend"; then
    echo "🔄 Restarting backend..."
    pm2 restart pubmed-helper-backend
else
    echo "▶️  Starting backend..."
    pm2 start ecosystem.config.js
    pm2 save
fi

# Frontend setup
echo "🌐 Setting up frontend..."
cd "$PROJECT_DIR/frontend"

if [ ! -f ".env.production" ]; then
    echo "Creating .env.production file..."
    cat > .env.production << EOF
VITE_API_BASE_URL=https://$DOMAIN
EOF
fi

npm install
npm run build

# Nginx configuration
echo "⚙️  Configuring Nginx..."
NGINX_CONFIG="/etc/nginx/sites-available/pubmed-helper"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "Creating Nginx config..."
    sudo cp "$PROJECT_DIR/nginx-config-pubmed-algovesh.conf" "$NGINX_CONFIG"
    sudo sed -i "s|/home/ubuntu/pubmed-helper|$PROJECT_DIR|g" "$NGINX_CONFIG"
    sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/pubmed-helper
fi

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your OpenAI API key"
echo "2. Run: pm2 restart pubmed-helper-backend"
echo "3. Set up SSL: sudo certbot --nginx -d $DOMAIN"
echo "4. Visit: http://$DOMAIN"
