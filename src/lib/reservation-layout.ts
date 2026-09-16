export type ReservationTimeRange = {
  id: string;
  start_time: string;
  end_time: string;
};

export type ReservationLane = {
  laneIndex: number;
  laneCount: number;
};

type ParsedReservation<T extends ReservationTimeRange> = {
  reservation: T;
  start: number;
  end: number;
  originalIndex: number;
};

function timeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 47 || minute < 0 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
}

/**
 * 同じスタッフの予約を、互いに重ならない表示レーンへ割り当てます。
 * 終了時刻と次の開始時刻が同じ予約は重複として扱いません。
 */
export function calculateReservationLanes<T extends ReservationTimeRange>(
  reservations: T[],
): Map<string, ReservationLane> {
  const result = new Map<string, ReservationLane>();
  const parsed: ParsedReservation<T>[] = [];

  reservations.forEach((reservation, originalIndex) => {
    const start = timeToMinutes(reservation.start_time);
    const end = timeToMinutes(reservation.end_time);

    if (start === null || end === null || end <= start) {
      result.set(reservation.id, { laneIndex: 0, laneCount: 1 });
      return;
    }

    parsed.push({ reservation, start, end, originalIndex });
  });

  parsed.sort((a, b) =>
    a.start - b.start || a.end - b.end || a.originalIndex - b.originalIndex,
  );

  let cluster: ParsedReservation<T>[] = [];
  let clusterEnd = -1;

  const assignCluster = () => {
    if (cluster.length === 0) return;

    const laneEnds: number[] = [];
    const assignments: Array<{ id: string; laneIndex: number }> = [];

    cluster.forEach((item) => {
      let laneIndex = laneEnds.findIndex((laneEnd) => laneEnd <= item.start);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(item.end);
      } else {
        laneEnds[laneIndex] = item.end;
      }
      assignments.push({ id: item.reservation.id, laneIndex });
    });

    const laneCount = laneEnds.length;
    assignments.forEach(({ id, laneIndex }) => {
      result.set(id, { laneIndex, laneCount });
    });
  };

  parsed.forEach((item) => {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      assignCluster();
      cluster = [];
      clusterEnd = -1;
    }

    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  });

  assignCluster();
  return result;
}
