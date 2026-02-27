import DashboardClient from "@/components/DashboardClient";
import DashboardStats from "@/components/DashboardStats";
import SeasonalFocus from "@/components/SeasonalFocus";
import DashboardCalendarSnapshot from "@/components/DashboardCalendarSnapshot";
import TodayBatch from "@/components/TodayBatch";
import { fetchTodaysBatch } from "@/app/actions";
import styles from "@/app/Dashboard.module.css";

export default async function Home() {
  const todaysBatch = await fetchTodaysBatch();

  return (
    <DashboardClient>
      <div className={styles.bentoTodaysBatch}>
        <TodayBatch profiles={todaysBatch} />
      </div>
      <div className={styles.bentoStats}>
        <DashboardStats />
      </div>
      <div className={styles.bentoFocus}>
        <SeasonalFocus />
      </div>
      <div className={styles.bentoCalendar}>
        <DashboardCalendarSnapshot />
      </div>
    </DashboardClient>
  );
}
