import { Suspense } from "react";
import CalendarContent from "./CalendarContent";

export default function CalendarPage() {
    return (
        <Suspense fallback={<div style={{ padding: "2rem" }}>Loading calendar...</div>}>
            <CalendarContent />
        </Suspense>
    );
}
