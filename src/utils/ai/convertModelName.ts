import { modelMapping, NormalizedModelOption, ModelOption, Command } from "@/types/ai";

export const convertModelName = (normalizedModelName: NormalizedModelOption): ModelOption => modelMapping[normalizedModelName];

