import { useAuth as useAuthBase } from "@algovn/auth"
import { userManager } from "./auth"

export const useAuth = () => useAuthBase(userManager)
