import mysql from 'mysql2/promise';
import fs from 'fs';

async function run() {
  const connection = await mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com',
    port: 4000,
    user: '338z5oDUxdCvTYx.root',
    password: '24EVsydAiKxNS13c',
    database: 'quan_ly_sinh_de_ai_v2',
    ssl: { rejectUnauthorized: true }
  });

  const [tablesResult] = await connection.query('SHOW TABLES');
  const tables = (tablesResult as any[]).map(r => Object.values(r)[0] as string);
  
  let md = '# Cấu trúc và Dữ liệu TiDB\n\n';
  md += '> Báo cáo cấu trúc và dữ liệu mẫu (tối đa 3 bản ghi mỗi bảng) từ database TiDB `quan_ly_sinh_de_ai_v2`.\n\n';
  
  for (const table of tables) {
    md += `## Bảng: \`${table}\`\n\n`;
    
    // Get Structure
    const [desc] = await connection.query(`DESCRIBE \`${table}\``);
    md += `### Cấu trúc\n`;
    md += '| Field | Type | Null | Key | Default | Extra |\n';
    md += '|---|---|---|---|---|---|\n';
    for (const row of desc as any[]) {
      md += `| ${row.Field} | ${row.Type} | ${row.Null} | ${row.Key} | ${row.Default ?? 'NULL'} | ${row.Extra} |\n`;
    }
    
    // Get Data
    md += `\n### Dữ liệu mẫu (Tối đa 3 bản ghi)\n`;
    const [data] = await connection.query(`SELECT * FROM \`${table}\` LIMIT 3`);
    if ((data as any[]).length === 0) {
      md += `*Bảng không có dữ liệu.*\n\n`;
    } else {
      const keys = Object.keys((data as any[])[0]);
      md += `| ${keys.join(' | ')} |\n`;
      md += `| ${keys.map(() => '---').join(' | ')} |\n`;
      for (const row of data as any[]) {
        const values = keys.map(k => {
          let val = row[k];
          if (typeof val === 'string') {
            val = val.replace(/\n/g, ' ').replace(/\|/g, '\\|');
            if (val.length > 100) return val.substring(0, 100) + '...';
            return val;
          }
          if (val === null) return 'NULL';
          return val;
        });
        md += `| ${values.join(' | ')} |\n`;
      }
      md += '\n';
    }
  }
  
  fs.writeFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/2a39ef0e-476c-4478-b2e8-947ee989c611/tidb_report.md', md);
  await connection.end();
  console.log('Report generated successfully.');
}

run().catch(console.error);
