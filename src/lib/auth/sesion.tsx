"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDefaultApiClient, type ApiClient } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { readFirebaseClientConfig } from "@/lib/firebase/config";

export interface UsuarioSesion {
  uid: string;
  correo: string | null;
  nombre: string | null;
  correoVerificado: boolean;
  /** ISO 8601 del último inicio de sesión según Firebase. */
  ultimoIngreso: string | null;
}

export type EstadoSesion = "cargando" | "anonimo" | "autenticado";

/**
 * Sesión del navegador. Firebase Auth identifica; Express decide rol, estado
 * y permisos (I-01). Las pantallas dependen de esta interfaz, no de Firebase.
 */
export interface Sesion {
  configurada: boolean;
  estado: EstadoSesion;
  usuario: UsuarioSesion | null;
  /** Cliente HTTP que envía el ID token vigente como Bearer. */
  api(): ApiClient;
  ingresar(correo: string, contrasena: string): Promise<void>;
  crearCuenta(datos: {
    nombre: string;
    correo: string;
    contrasena: string;
  }): Promise<void>;
  reenviarVerificacion(): Promise<void>;
  /** Recarga el usuario y fuerza un token nuevo; devuelve si el correo ya está verificado. */
  comprobarVerificacion(): Promise<boolean>;
  /**
   * Correo de Firebase para definir o cambiar la contraseña: invitación de un
   * admin nuevo (DEC-03) o cambio de la propia (DEC-08). `volverA` es la ruta
   * a la que el enlace devuelve tras guardarla.
   */
  enviarCorreoContrasena(correo: string, volverA: string): Promise<void>;
  /** Vuelve a leer nombre y correo de Firebase tras un cambio hecho por Express. */
  recargarUsuario(): Promise<void>;
  cerrarSesion(): Promise<void>;
}

export const SesionContext = createContext<Sesion | null>(null);

export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);
  if (!sesion) throw new Error("useSesion requiere ProveedorSesion.");
  return sesion;
}

function aUsuario(user: User): UsuarioSesion {
  const ultimo = user.metadata.lastSignInTime;
  return {
    uid: user.uid,
    correo: user.email,
    nombre: user.displayName,
    correoVerificado: user.emailVerified,
    ultimoIngreso: ultimo ? new Date(ultimo).toISOString() : null,
  };
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  // Igual en servidor y navegador (variables insertadas en build): sin desajuste de hidratación.
  const configurada = readFirebaseClientConfig() !== null;
  const [auth] = useState(() =>
    typeof window === "undefined" ? null : getFirebaseAuth(),
  );
  const [estado, setEstado] = useState<EstadoSesion>(
    configurada ? "cargando" : "anonimo",
  );
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (user) => {
      setUsuario(user ? aUsuario(user) : null);
      setEstado(user ? "autenticado" : "anonimo");
    });
  }, [auth]);

  const sesion = useMemo<Sesion>(() => {
    const requerirAuth = () => {
      if (!auth) throw new Error("Firebase no está configurado.");
      return auth;
    };
    const usuarioActual = () => {
      const user = requerirAuth().currentUser;
      if (!user) throw new Error("No hay sesión iniciada.");
      return user;
    };
    return {
      configurada,
      estado,
      usuario,
      api: () =>
        getDefaultApiClient(async () =>
          auth?.currentUser ? auth.currentUser.getIdToken() : null,
        ),
      async ingresar(correo, contrasena) {
        await signInWithEmailAndPassword(requerirAuth(), correo, contrasena);
      },
      async crearCuenta({ nombre, correo, contrasena }) {
        const { user } = await createUserWithEmailAndPassword(
          requerirAuth(),
          correo,
          contrasena,
        );
        if (nombre) await updateProfile(user, { displayName: nombre });
        await sendEmailVerification(user);
        setUsuario(aUsuario(user));
      },
      async reenviarVerificacion() {
        await sendEmailVerification(usuarioActual());
      },
      async comprobarVerificacion() {
        const user = usuarioActual();
        await user.reload();
        if (!user.emailVerified) return false;
        await user.getIdToken(true);
        setUsuario(aUsuario(user));
        return true;
      },
      async enviarCorreoContrasena(correo, volverA) {
        await sendPasswordResetEmail(requerirAuth(), correo, {
          url: new URL(volverA, window.location.origin).toString(),
        });
      },
      async recargarUsuario() {
        const user = usuarioActual();
        await user.reload();
        setUsuario(aUsuario(user));
      },
      async cerrarSesion() {
        if (auth) await signOut(auth);
      },
    };
  }, [auth, configurada, estado, usuario]);

  return (
    <SesionContext.Provider value={sesion}>{children}</SesionContext.Provider>
  );
}
