import { useQuery } from "@tanstack/react-query";
import * as api from "./api";

export const floorKeys = {
    all: ["floors"] as const,
};

export function useFloors() {
    return useQuery({
        queryKey: floorKeys.all,
        queryFn: () => api.fetchFloorsAssigned(),
        staleTime: 5_000,
    });
}