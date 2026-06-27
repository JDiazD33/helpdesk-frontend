export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  empresaId?: number;
  empresaNombre?: string;
}

export interface CategoriaRequest {
  nombre: string;
  descripcion?: string;
}

export interface PageResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
