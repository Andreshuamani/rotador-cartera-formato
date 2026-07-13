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

export interface OrdenPendiente {
  id: number;
  nombre_empresa: string;
  id_empresa: number;
  grupo_origen: string;
  grupo_destino: string;
  cantidad_movimiento: number;
  mueve_cgmsv: boolean;
  mueve_mercurius: boolean;
  reparte_varios: boolean;
}

export interface CarteraPendiente {
  id_empresa: number;
  nombre_empresa: string;
  ordenes_pendientes: number;
  casos_estimados: number;
  primera_solicitud: string | null;
  ordenes: OrdenPendiente[];
}

export interface PendientesResponse {
  total_carteras: number;
  carteras: CarteraPendiente[];
}

export interface DetalleEjecucion {
  grupo_origen: string;
  grupo_destino: string;
  casos_movidos: number;
  monto_movido: number;
}

export interface EjecucionResponse {
  id_empresa: number;
  nombre_empresa: string;
  casos_movidos: number;
  monto_movido: number;
  detalle: DetalleEjecucion[];
}

export interface ResumenCarterasFormato {
  id_empresa: number;
  nombre_empresa: string;
  grupo_origen: string;
  grupo_destino: string;
  casos: number;
  monto: number;
}

export interface ObtenerCasosResponse {
  lote_id: string;
  total_casos: number;
  total_monto: number;
  resumen: ResumenCarterasFormato[];
}

export interface DetalleEjecucionCarterasFormato {
  id_empresa: number;
  nombre_empresa: string;
  grupo_origen: string;
  grupo_destino: string;
  casos_movidos: number;
  monto_movido: number;
}

export interface EjecutarLoteResponse {
  lote_id: string;
  casos_movidos: number;
  monto_movido: number;
  detalle: DetalleEjecucionCarterasFormato[];
  stock: Record<string, unknown>[];
}
