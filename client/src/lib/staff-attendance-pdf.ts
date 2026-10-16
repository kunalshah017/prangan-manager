import type { AttendanceRecord } from "@/types/api";

export type StaffAttendanceRole = "CENTER_MANAGER" | "EDUCATOR";
export type StaffAttendanceStatus = AttendanceRecord["status"];

export type StaffAttendancePdfStaff = {
  id: string;
  name: string;
  role: StaffAttendanceRole;
  statuses: Array<StaffAttendanceStatus | "">;
};

export type StaffAttendancePdfRoleGroup = {
  role: StaffAttendanceRole;
  attendanceRate: string;
  staff: StaffAttendancePdfStaff[];
};

export type StaffAttendancePdfModel = {
  dates: string[];
  roleGroups: StaffAttendancePdfRoleGroup[];
  statusTotals: Record<StaffAttendanceStatus, number>;
  attendanceRate: string;
};

export type StaffAttendanceFollowUp = {
  staff: Array<{ name: string; absent: number; unavailable: number; lastExceptionDate: string }>;
  dates: Array<{ date: string; present: number; absent: number; unavailable: number; affectedStaff: string[] }>;
};

const roles: StaffAttendanceRole[] = ["CENTER_MANAGER", "EDUCATOR"];

const toRate = (present: number, absent: number) => {
  const basis = present + absent;
  return basis ? ((present / basis) * 100).toFixed(1) : "0.0";
};

export const buildStaffAttendancePdfModel = ({
  records,
}: {
  records: AttendanceRecord[];
}): StaffAttendancePdfModel => {
  const dates = Array.from(
    new Set(records.map((record) => record.date.slice(0, 10))),
  ).sort();
  const statusTotals: Record<StaffAttendanceStatus, number> = {
    PRESENT: 0,
    ABSENT: 0,
    NOT_AVAILABLE: 0,
    HOLIDAY: 0,
  };
  const people = new Map<
    string,
    { id: string; name: string; role: StaffAttendanceRole; records: Map<string, StaffAttendanceStatus> }
  >();

  for (const record of records) {
    statusTotals[record.status] += 1;
    const role = record.roleAssignment?.subRole;
    if (role !== "CENTER_MANAGER" && role !== "EDUCATOR") continue;
    if (!people.has(record.userId)) {
      people.set(record.userId, {
        id: record.userId,
        name: record.userName,
        role,
        records: new Map(),
      });
    }
    people.get(record.userId)!.records.set(record.date.slice(0, 10), record.status);
  }

  const roleGroups = roles
    .map((role) => {
      const staff = Array.from(people.values())
        .filter((person) => person.role === role)
        .sort((left, right) => left.name.localeCompare(right.name));
      const roleRecords = records.filter(
        (record) => record.roleAssignment?.subRole === role,
      );
      const present = roleRecords.filter((record) => record.status === "PRESENT").length;
      const absent = roleRecords.filter((record) => record.status === "ABSENT").length;
      return {
        role,
        attendanceRate: toRate(present, absent),
        staff: staff.map((person) => ({
          id: person.id,
          name: person.name,
          role: person.role,
          statuses: dates.map((date) => person.records.get(date) || ""),
        })),
      };
    })
    .filter((group) => group.staff.length);

  return {
    dates,
    roleGroups,
    statusTotals,
    attendanceRate: toRate(statusTotals.PRESENT, statusTotals.ABSENT),
  };
};

export const buildStaffAttendanceFollowUp = ({ records }: { records: AttendanceRecord[] }): StaffAttendanceFollowUp => {
  const model = buildStaffAttendancePdfModel({ records });
  const people = model.roleGroups.flatMap((group) => group.staff);

  const staff = people.map((person) => {
    let absent = 0;
    let unavailable = 0;
    let lastExceptionDate = "";
    person.statuses.forEach((status, index) => {
      if (status === "ABSENT") absent++;
      if (status === "NOT_AVAILABLE") unavailable++;
      if (status === "ABSENT" || status === "NOT_AVAILABLE") lastExceptionDate = model.dates[index];
    });
    return { name: person.name, absent, unavailable, lastExceptionDate };
  }).filter((person) => person.absent + person.unavailable > 0)
    .sort((left, right) => right.absent - left.absent || right.unavailable - left.unavailable || left.name.localeCompare(right.name));

  const dates = model.dates.map((date, index) => {
    const present = people.filter((person) => person.statuses[index] === "PRESENT").length;
    const absentPeople = people.filter((person) => person.statuses[index] === "ABSENT");
    const unavailablePeople = people.filter((person) => person.statuses[index] === "NOT_AVAILABLE");
    return {
      date,
      present,
      absent: absentPeople.length,
      unavailable: unavailablePeople.length,
      affectedStaff: [...absentPeople, ...unavailablePeople].map((person) => person.name).sort((left, right) => left.localeCompare(right)),
    };
  }).filter((date) => date.absent + date.unavailable > 0)
    .sort((left, right) => (right.absent + right.unavailable) - (left.absent + left.unavailable) || right.absent - left.absent || left.date.localeCompare(right.date));

  return { staff, dates };
};
