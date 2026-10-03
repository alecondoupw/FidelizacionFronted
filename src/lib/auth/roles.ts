/**
 * Roles documentados en SRC-02 pp. 1, 9–10 y 14–15. El frontend sólo los usa
 * para navegación y presentación; Express decide el permiso real (I-01).
 */
export const ROLES = ["cliente", "administrador"] as const;

export type Rol = (typeof ROLES)[number];
