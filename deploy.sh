#!/bin/bash
# Deploy Hanzi Memory Recall to GitHub Pages

set -e

echo "🚀 Deploying Hanzi Memory Recall to GitHub Pages..."

# Navigate to script directory
cd "$(dirname "$0")"

# Export latest words from database
echo "📤 Exporting words from database..."
cd utils/hanzi_words
.venv/bin/python export_for_web.py --output ../../public/data/words.json
cd ../..

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the app
echo "🔨 Building app..."
npm run build

# Create .nojekyll to prevent GitHub Pages from ignoring files starting with underscore
touch dist/.nojekyll

# Deploy to gh-pages branch
echo "📡 Deploying to GitHub Pages..."
cd dist

# Initialize git if needed
if [ ! -d ".git" ]; then
    git init -b gh-pages
    git remote add origin https://github.com/jricardo27/recaller.git
fi

# Add and commit
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || true

# Push to gh-pages branch
git push -f origin gh-pages:gh-pages || {
    echo "❌ Failed to push. Make sure you have push access to the repository."
    exit 1
}

echo "✅ Deployed successfully!"
echo "🌐 Your app will be available at: https://jricardo27.github.io/recaller/"
