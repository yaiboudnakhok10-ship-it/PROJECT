const fs = require('fs');
const path = require('path');

// สร้างโฟลเดอร์ dist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// คัดลอกไฟล์จาก src ไป dist (เฉพาะไฟล์ ไม่รวมโฟลเดอร์)
const extensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg'];

const files = fs.readdirSync('src').filter(file => {
  const fullPath = path.join('src', file);
  const isFile = fs.statSync(fullPath).isFile();
  const isCorrectExt = extensions.includes(path.extname(file).toLowerCase());
  return isFile && isCorrectExt;
});

files.forEach(file => {
  fs.copyFileSync(path.join('src', file), path.join('dist', file));
  console.log(`Copied: ${file}`);
});

console.log('Build complete!');