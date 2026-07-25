export interface SubjectItem {
  id: string;
  name: string;
  code?: string;
}

/**
 * Utility to filter subject options and set default subject ID based on logged in user.
 * 
 * Rules:
 * - Admin (Quản trị hệ thống) & Academic Head (Trưởng phòng giáo vụ) see ALL subjects, no forced filtering.
 * - Teacher (Giáo viên bộ môn) & Department Head (Tổ trưởng bộ môn) only see their assigned subjects,
 *   and default selection is set to their assigned subject.
 */
export function getUserSubjectFilter(
  allSubjects: SubjectItem[],
  user?: any
): {
  filteredSubjects: SubjectItem[];
  defaultSubjectId: string | null;
  isRestricted: boolean;
} {
  let currentUser = user;
  if (!currentUser) {
    try {
      const stored = localStorage.getItem('user_info');
      if (stored) currentUser = JSON.parse(stored);
    } catch (e) {
      // ignore
    }
  }

  if (!currentUser) {
    return {
      filteredSubjects: allSubjects,
      defaultSubjectId: allSubjects.length > 0 ? allSubjects[0].id : null,
      isRestricted: false,
    };
  }

  // Check if admin or academic head
  const isUnrestricted =
    currentUser.role === 'admin' ||
    currentUser.groups?.some(
      (g: any) =>
        g.code === 'GRP_ADMIN' ||
        g.code === 'GRP_ACADEMIC' ||
        g.name === 'Quản trị hệ thống' ||
        g.name === 'Trưởng phòng giáo vụ'
    );

  const userSubjectIds: string[] = Array.isArray(currentUser.subjects) ? currentUser.subjects : [];

  if (isUnrestricted || userSubjectIds.length === 0) {
    return {
      filteredSubjects: allSubjects,
      defaultSubjectId: allSubjects.length > 0 ? allSubjects[0].id : null,
      isRestricted: false,
    };
  }

  // Restricted to assigned subjects
  const filtered = allSubjects.filter(
    (s) =>
      userSubjectIds.includes(s.id) ||
      (s.code && userSubjectIds.includes(s.code)) ||
      (s.name && userSubjectIds.includes(s.name))
  );

  const available = filtered.length > 0 ? filtered : allSubjects;
  const defaultId = available.length > 0 ? available[0].id : null;

  return {
    filteredSubjects: available,
    defaultSubjectId: defaultId,
    isRestricted: true,
  };
}
