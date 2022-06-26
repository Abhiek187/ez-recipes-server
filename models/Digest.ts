import { SubDigest } from "./SubDigest";

export interface Digest extends SubDigest {
  sub?: SubDigest;
}
