export interface MovimientoResumen {
  grupo_origen: string;
  grupo_destino: string;
  casos_movidos: number;
  monto_movido: number;
  fecha: string;
}

export interface EmpresaResumen {
  nombre_empresa: string;
  movimientos: MovimientoResumen[];
}

export interface DashboardResumenResponse {
  mes: number;
  anio: number;
  totales: {
    casos_movidos: number;
    monto_movido: number;
    rotaciones: number;
  };
  empresas: EmpresaResumen[];
  empresas_adicionales: string[];
}

export interface Movimiento {
  id: number;
  id_empresa: string;
  nombre_empresa: string;
  grupo_origen: string;
  grupo_destino: string;
  cantidad_movimiento: number;
  mueve_cgmsv: boolean;
  mueve_mercurius: boolean;
  reparte_varios: boolean;
  casos_evaluados: number;
  casos_excluidos_cgmsv: number;
  casos_excluidos_mercurius: number;
  estado_rotacion: string;
  fecha_rotacion: string | null;
  fecha_creacion: string;
}

export interface MovimientosResponse {
  total: number;
  movimientos: Movimiento[];
}

export interface ExclusionesCartera {
  casos_evaluados: number;
  casos_excluidos_cgmsv: number;
  casos_excluidos_mercurius: number;
  casos_a_rotar: number;
}

export interface ReglasExclusion {
  mueve_cgmsv: boolean;
  excluye_fallecido: boolean;
  excluye_sin_telefono: boolean;
}

export interface FilaPreview extends ExclusionesCartera, ReglasExclusion {
  grupo_origen: string;
  grupo_destino: string;
  casos_excluidos_fallecido: number;
  casos_excluidos_sin_telefono: number;
}

export interface PrevisualizarResponse {
  filas: FilaPreview[];
  totales: ExclusionesCartera;
}

export interface HistorialItem {
  id: number;
  id_empresa: number;
  nombre_empresa: string;
  grupo_origen: string;
  grupo_destino: string;
  cantidad_movida: number;
  fecha_ejecucion: string;
  mes: number;
  anio: number;
}

export interface HistoricoResponse {
  total: number;
  historico: HistorialItem[];
}

export interface MovimientosMesDetalle {
  nombre_empresa: string;
  grupo_origen: string;
  grupo_destino: string;
  total_movidos: number;
  cantidad_ejecuciones: number;
}

export interface MovimientosMesResponse {
  mes: number;
  anio: number;
  totales: {
    total_casos_movidos: number;
    empresas_procesadas: number;
    total_ejecuciones: number;
  };
  detalle: MovimientosMesDetalle[];
}
