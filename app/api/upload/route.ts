import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function sanitizeLocation(loc: string): string {
    return loc.replace(/[\s,]+/g, "_").replace(/[\\/:*?"<>|]/g, "") || "unknown";
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const postId = formData.get("postId") as string | null;
        const accountId = formData.get("accountId") as string | null;
        const dateStr = formData.get("dateStr") as string | null;
        const locationFolder = formData.get("locationFolder") as string | null;

        if (!file || !postId || !accountId || !dateStr || !locationFolder) {
            return NextResponse.json(
                { error: "Missing file, postId, accountId, dateStr, or locationFolder" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = path.extname(file.name) || ".jpg";
        const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext.toLowerCase())
            ? ext.toLowerCase()
            : ".jpg";
        const filename = `${postId}${safeExt}`;

        const parentFolder = sanitizeLocation(locationFolder);
        const dir = path.join(UPLOAD_DIR, parentFolder, accountId, dateStr);
        await mkdir(dir, { recursive: true });

        const filePath = path.join(dir, filename);
        await writeFile(filePath, buffer);

        const imagePath = `/api/uploads/${parentFolder}/${accountId}/${dateStr}/${filename}`;
        return NextResponse.json({ imagePath });
    } catch (err) {
        console.error("Upload error:", err);
        return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 }
        );
    }
}
