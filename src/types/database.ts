// ═══════════════════════════════════════════════════════════════════════
// Database Types — Reflect the PostgreSQL schema
// Generated manually to match sql/01_schema.sql
// ═══════════════════════════════════════════════════════════════════════

export interface Database {
  public: {
    Tables: {
      sub_categorias: {
        Row: {
          id_categoria: number;
          tipo: string;
        };
        Insert: {
          id_categoria?: number;
          tipo: string;
        };
        Update: {
          id_categoria?: number;
          tipo?: string;
        };
      };
      sub_cargos: {
        Row: {
          id_cargo: number;
          descripcion: string;
          nivel_jerarquia: number;
        };
        Insert: {
          id_cargo?: number;
          descripcion: string;
          nivel_jerarquia: number;
        };
        Update: {
          id_cargo?: number;
          descripcion?: string;
          nivel_jerarquia?: number;
        };
      };
      sub_roles: {
        Row: {
          id_rol: number;
          descripcion: string;
          inactivo: number;
          observacion: string | null;
        };
        Insert: {
          id_rol?: number;
          descripcion: string;
          inactivo?: number;
          observacion?: string | null;
        };
        Update: {
          id_rol?: number;
          descripcion?: string;
          inactivo?: number;
          observacion?: string | null;
        };
      };
      sub_colaboradores: {
        Row: {
          id_colaborador: number;
          ci_documento: string;
          nombre: string;
          fecha_ingreso: string;
          habilitado: string;
          id_cargo: number;
          id_rol: number | null;
        };
        Insert: {
          id_colaborador?: number;
          ci_documento: string;
          nombre: string;
          fecha_ingreso: string;
          habilitado?: string;
          id_cargo: number;
          id_rol?: number | null;
        };
        Update: {
          id_colaborador?: number;
          ci_documento?: string;
          nombre?: string;
          fecha_ingreso?: string;
          habilitado?: string;
          id_cargo?: number;
          id_rol?: number | null;
        };
      };
      sub_usuarios: {
        Row: {
          id_usuario: number;
          usuario: string;
          password_hash: string;
          id_colaborador: number;
          fecha_creacion: string;
          situacion: string;
        };
        Insert: {
          id_usuario?: number;
          usuario: string;
          password_hash: string;
          id_colaborador: number;
          fecha_creacion?: string;
          situacion?: string;
        };
        Update: {
          id_usuario?: number;
          usuario?: string;
          password_hash?: string;
          id_colaborador?: number;
          fecha_creacion?: string;
          situacion?: string;
        };
      };
      sub_activos: {
        Row: {
          id_activo: number;
          id_categoria: number;
          marca: string | null;
          modelo: string | null;
          serialnumber: string | null;
          observacion: string | null;
          precio_base: number;
          estado: string;
          foto_url: string | null;
          fam: string | null;
        };
        Insert: {
          id_activo?: number;
          id_categoria: number;
          marca?: string | null;
          modelo?: string | null;
          serialnumber?: string | null;
          observacion?: string | null;
          precio_base: number;
          estado?: string;
          foto_url?: string | null;
          fam?: string | null;
        };
        Update: {
          id_activo?: number;
          id_categoria?: number;
          marca?: string | null;
          modelo?: string | null;
          serialnumber?: string | null;
          observacion?: string | null;
          precio_base?: number;
          estado?: string;
          foto_url?: string | null;
          fam?: string | null;
        };
      };
      sub_ofertas: {
        Row: {
          id_oferta: number;
          id_activo: number;
          id_colaborador: number;
          monto: number;
          fecha_hora: string;
        };
        Insert: {
          id_oferta?: number;
          id_activo: number;
          id_colaborador: number;
          monto: number;
          fecha_hora?: string;
        };
        Update: {
          id_oferta?: number;
          id_activo?: number;
          id_colaborador?: number;
          monto?: number;
          fecha_hora?: string;
        };
      };
      sub_resultados: {
        Row: {
          id_resultado: number;
          id_activo: number;
          id_colaborador_ganador: number;
          monto_final: number;
          fecha_cierre: string;
          criterio_desempate: string;
        };
        Insert: {
          id_resultado?: number;
          id_activo: number;
          id_colaborador_ganador: number;
          monto_final: number;
          fecha_cierre?: string;
          criterio_desempate: string;
        };
        Update: {
          id_resultado?: number;
          id_activo?: number;
          id_colaborador_ganador?: number;
          monto_final?: number;
          fecha_cierre?: string;
          criterio_desempate?: string;
        };
      };
      sub_app_config: {
        Row: {
          id: number;
          fecha_fin_subasta: string | null;
        };
        Insert: {
          id?: number;
          fecha_fin_subasta?: string | null;
        };
        Update: {
          id?: number;
          fecha_fin_subasta?: string | null;
        };
      };
      sub_intentos_login: {
        Row: {
          id_intento: number;
          usuario: string | null;
          fecha_intento: string;
          exitoso: string;
          ip_origen: string | null;
        };
        Insert: {
          id_intento?: number;
          usuario?: string | null;
          fecha_intento?: string;
          exitoso: string;
          ip_origen?: string | null;
        };
        Update: {
          id_intento?: number;
          usuario?: string | null;
          fecha_intento?: string;
          exitoso?: string;
          ip_origen?: string | null;
        };
      };
      sub_auditoria_cambios: {
        Row: {
          id_auditoria: number;
          tabla_afectada: string;
          id_registro: number | null;
          accion: string;
          campo: string | null;
          valor_anterior: string | null;
          valor_nuevo: string | null;
          usuario: string | null;
          fecha: string;
        };
        Insert: {
          id_auditoria?: number;
          tabla_afectada: string;
          id_registro?: number | null;
          accion: string;
          campo?: string | null;
          valor_anterior?: string | null;
          valor_nuevo?: string | null;
          usuario?: string | null;
          fecha?: string;
        };
        Update: {
          id_auditoria?: number;
          tabla_afectada?: string;
          id_registro?: number | null;
          accion?: string;
          campo?: string | null;
          valor_anterior?: string | null;
          valor_nuevo?: string | null;
          usuario?: string | null;
          fecha?: string;
        };
      };
    };
    Views: {
      sub_v_datos_colaborador: {
        Row: {
          id_usuario: number | null;
          id_colaborador: number;
          ci_documento: string;
          nombre: string;
          fecha_ingreso: string;
          habilitado: string;
          cargo: string;
          nivel_jerarquia: number;
          rol: string | null;
          id_rol: number | null;
          usuario_registrado: string;
        };
      };
      sub_v_ofertas_recibidas: {
        Row: {
          id_oferta: number;
          id_activo: number;
          marca: string | null;
          modelo: string | null;
          serialnumber: string | null;
          fam: string | null;
          categoria: string;
          precio_base: number;
          id_colaborador: number;
          nombre_colaborador: string;
          ci_documento: string;
          cargo: string;
          nivel_jerarquia: number;
          monto: number;
          fecha_hora_display: string;
          fecha_hora: string;
        };
      };
      sub_v_resultados_detalle: {
        Row: {
          id_resultado: number;
          id_activo: number;
          marca: string | null;
          modelo: string | null;
          serialnumber: string | null;
          fam: string | null;
          categoria: string;
          precio_base: number;
          id_colaborador_ganador: number;
          colaborador_ganador: string;
          ci_documento: string;
          monto_final: number;
          criterio_desempate: string;
          fecha_cierre_display: string;
          fecha_cierre: string;
        };
      };
    };
    Functions: {
      registrar_nuevo_usuario: {
        Args: { p_ci_documento: string; p_password: string };
        Returns: { success: boolean; error?: string; message?: string };
      };
      autenticar_usuario: {
        Args: { p_ci_documento: string; p_password: string; p_ip?: string };
        Returns: {
          success: boolean;
          error?: string;
          data?: {
            id_usuario: number;
            id_colaborador: number;
            ci_documento: string;
            nombre: string;
            id_rol: number | null;
            es_admin: boolean;
          };
        };
      };
      registrar_oferta: {
        Args: { p_id_activo: number; p_ci_documento: string; p_monto: number };
        Returns: { success: boolean; error?: string; message?: string };
      };
      procesar_ganadores: {
        Args: Record<string, never>;
        Returns: { success: boolean; message?: string; total_adjudicados?: number };
      };
    };
  };
}
