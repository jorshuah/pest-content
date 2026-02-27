import ContentBankClient from "@/components/ContentBankClient";
import { fetchContentTemplates } from "@/app/actions";

export default async function ContentBankPage() {
    const templates = await fetchContentTemplates();

    return (
        <ContentBankClient initialTemplates={templates} />
    );
}
