import ProgressClient from "@/components/ProgressClient";
import { fetchPostsWithImagesByAccount } from "@/app/actions";

export default async function ProgressPage() {
    const data = await fetchPostsWithImagesByAccount();

    return (
        <ProgressClient initialData={data} />
    );
}
