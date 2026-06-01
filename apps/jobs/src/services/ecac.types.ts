export type PendencyType =
  | 'DEBT'
  | 'DECLARATION'
  | 'INSTALLMENT'
  | 'PROCESS'
  | 'SIMPLES'
  | 'OTHER';

export interface EcacPendencyData {
  type: PendencyType;
  description: string;
  amount?: number;    // valor em centavos
  dueDate?: Date;
  situation?: string;
}

export interface EcacConsultationResult {
  success: boolean;
  pendencies: EcacPendencyData[];
  errorMessage?: string;
  contentHash?: string;
}
