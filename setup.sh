#!/bin/bash

echo "🚀 Setting up Event Management Monolith App..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun is installed"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please update .env with your actual values:"
    echo "   - DATABASE_URL: Your Neon PostgreSQL connection string"
    echo "   - JWT_SECRET: A strong secret key"
    echo "   - ETHEREAL_USER & ETHEREAL_PASS: Your Ethereal email credentials"
else
    echo "✅ .env file already exists"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
bun run db:generate

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with the correct values"
echo "2. Run database migrations: bun run db:migrate"
echo "3. Start the development server: bun run dev"
echo ""
echo "The app will be available at:"
echo "   - API: http://localhost:3000"
echo "   - Frontend: http://localhost:3000"
echo "   - Swagger Docs: http://localhost:3000/swagger"
echo "   - WebSocket: ws://localhost:3000/ws"

