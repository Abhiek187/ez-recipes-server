import { SubDigest } from "./SubDigest";

export type Digest = {
  label: string;
  tag: string;
  schemaOrgTag: string;
  total: number;
  hasRDI: boolean;
  daily: number;
  unit: string;
  sub?: SubDigest;
};
