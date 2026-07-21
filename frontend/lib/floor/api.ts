import { Floor } from "@/app/generated/prisma/client";

async function json<T>(res: Response): Promise<T> {
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || "Request failed.");
    return data as T;
}

export async function fetchFloorsAssigned(): Promise<Floor[]> {
    return json<Floor[]>(await fetch(`/api/floors/assigned`));
}
