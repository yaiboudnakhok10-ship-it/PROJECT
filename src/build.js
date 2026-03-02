const fs = require('fs');
const path = require('path');

// สร้างโฟลเดอร์ dist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// คัดลอกไฟล์ทั้งหมดจาก src ไป dist
const files = fs.readdirSync('src');
files.forEach(file => {
  fs.copyFileSync(
    path.join('src', file),
    path.join('dist', file)
  );
  console.log(`Copied: ${file}`);
});

console.log('Build complete!');