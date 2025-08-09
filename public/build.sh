#!/bin/bash

# MyApp v4.1 - Build Script per Vercel
echo "🚀 Starting MyApp v4.1 build process..."

# Verifica presenza file essenziali
echo "📁 Checking essential files..."

required_files=("index.html" "login.html" "home.html" "vercel.json" "package.json")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    else
        echo "✅ $file found"
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Missing required files:"
    printf '%s\n' "${missing_files[@]}"
    exit 1
fi

# Verifica sintassi HTML (basic check)
echo "🔍 Validating HTML files..."
for html_file in *.html; do
    if [ -f "$html_file" ]; then
        # Basic check per DOCTYPE
        if grep -q "<!DOCTYPE html>" "$html_file"; then
            echo "✅ $html_file has valid DOCTYPE"
        else
            echo "⚠️  $html_file missing DOCTYPE"
        fi
    fi
done

# Verifica configurazione Supabase
echo "🔐 Checking Supabase configuration..."
if grep -q "pvzdilkozpspsnepedqc.supabase.co" *.html; then
    echo "✅ Supabase URL found in HTML files"
else
    echo "⚠️  Supabase URL not found"
fi

# Verifica JSON files
echo "📄 Validating JSON files..."
if command -v node &> /dev/null; then
    for json_file in *.json; do
        if [ -f "$json_file" ]; then
            if node -e "JSON.parse(require('fs').readFileSync('$json_file', 'utf8'))" 2>/dev/null; then
                echo "✅ $json_file is valid JSON"
            else
                echo "❌ $json_file has invalid JSON syntax"
                exit 1
            fi
        fi
    done
else
    echo "⚠️  Node.js not available, skipping JSON validation"
fi

# Conta file totali
total_files=$(find . -maxdepth 1 -type f | wc -l)
echo "📊 Total files in root: $total_files"

# Info progetto
echo "📱 MyApp v4.1 Build Summary:"
echo "   - Platform: Static Web App"
echo "   - Database: Supabase PostgreSQL"
echo "   - Styling: Tailwind CSS"
echo "   - Authentication: Supabase Auth"
echo "   - Deployment: Vercel"

echo "✅ Build validation completed successfully!"
echo "🚀 Ready for deployment to Vercel"

exit 0
