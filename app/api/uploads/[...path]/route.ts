import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif"
};

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params;
        if (!pathSegments?.length) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const safePath = pathSegments.filter((p) => !p.includes("..") && p.length > 0);
        if (safePath.length !== pathSegments.length) {
            return NextResponse.json({ error: "Invalid path" }, { status: 400 });
        }

        const filePath = path.join(UPLOAD_DIR, ...safePath);
        const buffer = await readFile(filePath);

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME[ext] || "application/octet-stream";

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "no-cache"
            }
        });
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}
