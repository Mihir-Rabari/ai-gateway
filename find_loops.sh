find apps packages -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -Hn "reduce(" {} + | grep filter
