#!/usr/bin/env bash
echo "🚀 Đang tối ưu hóa các file .glb trong thư mục public/models/..."
for file in public/models/*.glb; do
  if [ -f "$file" ]; then
    npx gltf-pipeline -i "$file" -o "$file" -d
  fi
done
echo "✅ Hoàn tất!"
