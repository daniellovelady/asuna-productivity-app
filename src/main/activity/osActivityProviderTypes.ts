export interface RawWindowInput {
  ownerName: string;
  title: string;
}

export interface OsActivityProvider {
  getActiveWindow(): Promise<RawWindowInput | null>;
}
