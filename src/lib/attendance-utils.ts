export function resolveAttendanceTimes(att: any) {
  let startTime = null;
  let endTime = null;
  let source: "effective" | "raw" = "raw";

  if (att.effective_clock_in) {
    startTime = new Date(att.effective_clock_in);
    source = "effective";
  } else if (att.clock_in) {
    startTime = new Date(att.clock_in);
  }

  if (att.effective_clock_out) {
    endTime = new Date(att.effective_clock_out);
    source = "effective";
  } else if (att.clock_out) {
    endTime = new Date(att.clock_out);
  }

  return { startTime, endTime, source };
}
