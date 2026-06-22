const fs = require('fs');
const path = require('path');

const srcDir = 'd:\\\\PTIT\\\\Do_an\\\\Do_An_NHCH\\\\quan-ly-sinh-de-ai-v2\\\\src\\\\components\\\\quan-ly-danh-muc\\\\danh-muc-khoi-lop';
const destDir = 'd:\\\\PTIT\\\\Do_an\\\\Do_An_NHCH\\\\quan-ly-sinh-de-ai-v2\\\\src\\\\components\\\\quan-ly-danh-muc\\\\danh-muc-mon-thi';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = ['index.tsx', 'create.tsx', 'update.tsx', 'delete.tsx', 'detail.tsx'];

files.forEach(file => {
  let content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  
  if (file === 'index.tsx') {
    const mockDataRegex = /const mockData: DanhMucKhoiLopType\[\] = \[[\s\S]*?\];/;
    const mockDataMonThi = `const mockData: DanhMucMonThiType[] = [
  { Id: '1', Ma: 'TO', Ten: 'Toán học', IsActive: true, CreatedAt: '22-12-2024' },
  { Id: '2', Ma: 'LI', Ten: 'Vật Lý', IsActive: true, CreatedAt: '22-12-2024' },
  { Id: '3', Ma: 'HO', Ten: 'Hóa Học', IsActive: true, CreatedAt: '22-12-2024' },
  { Id: '4', Ma: 'SI', Ten: 'Sinh học', IsActive: false, CreatedAt: '22-12-2024' },
  { Id: '5', Ma: 'SU', Ten: 'Lịch sử', IsActive: false, CreatedAt: '22-12-2024' },
];`;
    content = content.replace(mockDataRegex, mockDataMonThi);
    content = content.replace('Mã/ tên khối lớp', 'Mã môn thi, tên môn thi');
  }

  content = content.replace(/KhoiLop/g, 'MonThi');
  content = content.replace(/Khối lớp/g, 'Môn thi');
  content = content.replace(/khối lớp/g, 'môn thi');
  
  fs.writeFileSync(path.join(destDir, file), content);
  console.log('Processed ' + file);
});
