import { checkUserPermission } from './src/utils/permissionUtils';

const user = {
  "id": "u-1783972457554",
  "username": "ngandh",
  "email": "q123@gmail.com",
  "fullName": "Đào Hà Ngân",
  "role": "user",
  "status": "active",
  "groups": [
    {
      "id": "g-1783972098471",
      "code": "GVBM",
      "name": "Giáo viên bộ môn",
      "permissions": [
        "topics.manage",
        "questions.submit",
        "questions.manage",
        "topics.submit",
        "matrices.manage",
        "matrices.submit",
        "exams.manage",
        "exams.submit"
      ]
    }
  ]
};

console.log('quan-ly-ma-tran-de: ', checkUserPermission(user as any, 'quan-ly-ma-tran-de'));
console.log('dashboard: ', checkUserPermission(user as any, 'dashboard'));
