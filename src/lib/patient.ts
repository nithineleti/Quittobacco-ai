/**
 * The Patient ID as people see and type it. Pure — used on the server (admin
 * panel, search) and the client (profile card) alike.
 */

const PREFIX = "QT";

/** 42 → "QT-000042". Six digits: room for a million patients, still short. */
export function formatPatientCode(patientNo: number): string {
  return `${PREFIX}-${String(patientNo).padStart(6, "0")}`;
}

/**
 * Reads a Patient ID back out of whatever a clinician typed — "QT-000042",
 * "qt 42", "000042" or plain "42" all mean patient 42. Anything with letters
 * beyond the prefix is not an ID (it is probably a name) and yields null.
 */
export function parsePatientCode(input: string): number | null {
  const cleaned = input.trim().toUpperCase().replace(/^QT[\s-]*/, "");
  if (!/^\d{1,9}$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
}

/**
 * Case-insensitive match of a free-text search against one patient. An ID
 * matches exactly; a name, e-mail or phone matches as a substring, so "ravi"
 * finds "Ravi Kumar" and "9876" finds a number ending in it.
 */
export function matchesPatientQuery(
  patient: {
    patient_no: number;
    display_name: string | null;
    email: string;
    phone: string | null;
  },
  q: string,
): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const asCode = parsePatientCode(needle);
  if (asCode !== null && patient.patient_no === asCode) return true;
  const digits = needle.replace(/\D/g, "");
  return (
    (patient.display_name ?? "").toLowerCase().includes(needle) ||
    patient.email.toLowerCase().includes(needle) ||
    (digits.length >= 4 && (patient.phone ?? "").replace(/\D/g, "").includes(digits))
  );
}
